import { analyseLibFiles, extractMainFiles, extractSingleLibraryFromDump } from '../parseLibraries'
import { assertNever } from '../utils'
import { saveFiles } from '../utils/files'
import { stdoutLog } from '../utils/logger'
import { observableFromEventEmitter } from '../utils/observable'
import {
  clientMessage,
  clientMessageType,
  messageFrom,
  processingResult,
  serverMessage,
  serverMessageType
} from './common'


const log = stdoutLog(`worker:${process.pid}`)
log.enabled = false

const processLibrary = async (
  { filename, libsPath, dumpPath }: {
    filename: string,
    libsPath: string,
    dumpPath: string,
  }): Promise<processingResult> => {

  log('got %o', filename)

  let name
  let version
  try {
    const libDesc = await extractSingleLibraryFromDump({ dumpPath, libsPath, filename })
    name = libDesc.name
    version = libDesc.version
  }
  catch (err) {
    log('Could not parse the filename: %o\n%I\n%I', filename, err, err.stack)
    return { filename }
  }

  const main = await saveFiles(extractMainFiles({ libsPath, name, version }))
  const analysis = await saveFiles(analyseLibFiles(main))

  log([
    'finished %o' + (main.length ? '' : ' (no main files found!!!)'),
    '   main files:',
    '%I',
    '   analysis files:',
    '%I'
  ].join('\n'), filename, main, analysis)

  return { filename, main, analysis }
}

const replyToParent = (msg: clientMessage) => {
  log('Replying with %o msg', clientMessageType[msg.type])
  process.send!(msg)
}

if (process.send) {
  process.on('SIGINT', () => {
    log('received SIGINT')
  })

  let processing: Promise<any> | null = null
  let subscription: ZenObservable.Subscription | null = null

  const terminateWorker = () => {
    if (subscription !== null) {
      subscription.unsubscribe()
    }
    process.disconnect()
    log('Gracefully exiting')
  }

  observableFromEventEmitter(process, 'message')
    .map((event) => (<[serverMessage, any]>event)[0])
    .subscribe({
      start(subscrb: ZenObservable.Subscription) {
        log('Started listening')
        subscription = subscrb
      },
      next(msg: serverMessage) {
        log('Received %o msg', serverMessageType[msg.type])
        if (msg.type === serverMessageType.startup) {
          replyToParent(<clientMessage>{
            from: messageFrom.client,
            type: clientMessageType.startupDone,
          })
        }
        else if (msg.type === serverMessageType.process) {
          const { libsPath, dumpPath, filename } = msg
          processing = processLibrary({ filename, libsPath, dumpPath })
            .then(({ filename, main, analysis }) => {
              replyToParent(<clientMessage>{
                from: messageFrom.client,
                type: clientMessageType.processingResult,
                filename,
                main,
                analysis,
              })
              processing = null
            })
        }
        else if (msg.type === serverMessageType.shutdown) {
          if (processing === null) {
            terminateWorker()
          }
          // remark: don't need to deal with shutdown while work is performed
          // that is because the worker is never released back into the pool before
          // it is done performing the work. Therefore the worker will never be
          // requested to finish while it is working.
          else {
            replyToParent(<clientMessage>{
              from: messageFrom.client,
              type: clientMessageType.delayShutdown,
            })
            processing.then(() => terminateWorker())
          }
        }
        else {
          assertNever(msg)
        }
      }
    })
}
