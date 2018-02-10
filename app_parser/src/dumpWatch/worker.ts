import { stripIndent } from 'common-tags'
import { analyseLibFiles, extractMainFiles, extractSingleLibraryFromDump } from '../parseLibraries'
import { assertNever } from '../utils'
import { saveFiles } from '../utils/files'
import { stdoutLog } from '../utils/logger'
import { observableFromEventEmitter } from '../utils/observable'
import {
  clientMessage3,
  messageFrom,
  messages,
  processingResult,
  processRequest,
  reanalyseLibRequest,
  reanalysisResult,
  serverMessage3
} from './common'


const log = stdoutLog(`worker:${process.pid}`)
log.enabled = false

const processLibrary = async (
  { filename, libsPath, dumpPath }: processRequest): Promise<processingResult> => {

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

  log(stripIndent`
    finished %o${main.length ? '' : ' (no main files found!!!)'}
       main files:
    %I
       analysis files:
    %I
  `, filename, main, analysis)

  return { filename, main, analysis }
}

const reanalyseLibrary = async (
  { libsPath, name, version }: reanalyseLibRequest): Promise<reanalysisResult> => {

  log('reanalysing %o %o', name, version)

  const main = await saveFiles(extractMainFiles({ libsPath, name, version },
    { conservative: true }))
  const analysis = await saveFiles(analyseLibFiles(main, { conservative: false }))

  log(stripIndent`
    finished %o %o${main.length ? '' : ' (no main files found!!!)'}
       analysis files:
    %I
  `, name, version, analysis)

  return { name, version, analysis }
}

type tmpServerMsgType = serverMessage3<messages, keyof messages>
  | { from: messageFrom.server, id: string, type: 'up' }
  | { from: messageFrom.server, id: string, type: 'down' }
type tmpClientMsgType = clientMessage3<messages, keyof messages>
  | { from: messageFrom.client, id: string, type: 'up' }
  | { from: messageFrom.client, id: string, type: 'down' }
const replyToParent = (msg: tmpClientMsgType) => {
  log('Replying with %o msg', msg.type)
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
    .map(([msg]): serverMessage3<messages, any> => msg)
    .subscribe({
      start(subscrb: ZenObservable.Subscription) {
        log('Started listening')
        subscription = subscrb
      },
      next(msg: tmpServerMsgType) {
        log('Received %o msg', msg.type)
        if (msg.type === 'up') {
          replyToParent({
            from: messageFrom.client,
            id: msg.id,
            type: msg.type,
          })
        }
        else if (msg.type === 'process') {
          const { libsPath, dumpPath, filename } = <processRequest>msg.data
          processing = processLibrary({ filename, libsPath, dumpPath })
            .then(({ filename, main, analysis }) => {
              replyToParent({
                from: messageFrom.client,
                id: msg.id,
                type: msg.type,
                data: {
                  filename,
                  main,
                  analysis,
                },
              })
              processing = null
            })
        }
        else if (msg.type === 'reanalyse') {
          const { libsPath, name, version } = <reanalyseLibRequest>msg.data
          reanalyseLibrary({ libsPath, name, version })
            .then(({ name, version, analysis }) => {
              replyToParent({
                from: messageFrom.client,
                id: msg.id,
                type: msg.type,
                data: {
                  name,
                  version,
                  analysis,
                },
              })
            })
        }
        else if (msg.type === 'down') {
          terminateWorker()
        }
        else {
          /* istanbul ignore next */
          assertNever(msg.type)
        }
      }
    })
}
