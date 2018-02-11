import { stripIndent } from 'common-tags'
import { IDebugger } from 'debug'
import { negate } from 'lodash'
import { Server as NetServer, Socket as NetSocket } from 'net'
import { analyseLibFiles, extractMainFiles, extractSingleLibraryFromDump } from '../parseLibraries'
import { assertNever, objectHasKey } from '../utils'
import { saveFiles } from '../utils/files'
import { stdoutLog } from '../utils/logger'
import { observableFromEventEmitter } from '../utils/observable'
import {
  clientMessage3,
  messageFrom,
  messages,
  MessagesMap,
  processingResult,
  processRequest,
  reanalyseLibRequest,
  reanalysisResult,
  serverMessage3,
  shutdownMsg,
  startupMsg,
  WorkerFunctionsMap
} from './common'
import Observable = require('zen-observable')


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

type messagesFromServer<Msg extends MessagesMap, Type extends keyof Msg> =
  startupMsg | shutdownMsg | serverMessage3<Msg, Type>
type msgHandle = NetSocket | NetServer | undefined

class WorkerExecutor<M extends MessagesMap> {
  public log: IDebugger

  private _bExObs: Observable<number>
  private _disObs: Observable<void>
  private _extObs: Observable<number>
  private _msgObs: Observable<messagesFromServer<M, keyof M>>
  private _wrnObs: Observable<Error>
  private _SIGINT_obs: Observable<string>

  private _eventsLog: IDebugger
  private _unsubscribeEventsLoggers: () => void

  constructor(fns: WorkerFunctionsMap<M>) {
    this._bExObs = observableFromEventEmitter(process, 'beforeExit')
      .map(([code]: [number]) => code)
    this._disObs = observableFromEventEmitter(process, 'disconnect')
      .map(() => {})
    this._extObs = observableFromEventEmitter(process, 'exit')
      .map(([code]: [number]) => code)
    this._msgObs = observableFromEventEmitter(process, 'message')
      .map(([msg, handle]: [messagesFromServer<M, keyof M>, msgHandle]) => msg)
    this._wrnObs = observableFromEventEmitter(process, 'warning')
      .map(([warning]: [Error]) => warning)

    const signalObsMapper = ([signal]: [string]) => signal
    this._SIGINT_obs = observableFromEventEmitter(process, 'SIGINT')
      .map(signalObsMapper)

    this.log = stdoutLog(`w_executor:${process.pid}`)
    this._eventsLog = stdoutLog(`${this.log.namespace}:ev`)

    const bExObsSubs = this._bExObs.subscribe((code) => {
      this._eventsLog('beforeExit (code)=(%o)', code)
    })
    const disObsSubs = this._disObs.subscribe(() => {
      this._eventsLog('disconnect')
    })
    const extObsSubs = this._extObs.subscribe((code) => {
      this._eventsLog('exit (code)=(%o)', code)
    })
    const msgObsSubs = this._msgObs.subscribe((message) => {
      this._eventsLog('msg %o', message)
    })
    const wrnObsSubs = this._wrnObs.subscribe((w) => {
      this._eventsLog('warning (name, message)=(%o, %o)\n%I', w.name, w.message, w.stack)
    })

    const signalSubsriber = (signal: string) => {
      this._eventsLog('signal %o', signal)
    }
    const SIGINT_ObsSubs = this._SIGINT_obs.subscribe(signalSubsriber)

    const upDownMsgFilter =
      (msg: messagesFromServer<M, keyof M>) => msg.type === 'up' || msg.type === 'down'
    const errHandler = (err: Error) => {
      this.log(`error in message subscription: '${err.message}'\n${err.stack}`)
    }

    const upDownMsgSubs = this._msgObs
      .filter(upDownMsgFilter)
      .subscribe({
        next: (msg: startupMsg | shutdownMsg) => {
          const { id, type } = msg

          if (type === 'up') {
            this._send({ id, type })
          }
          else if (type === 'down') {
            this._terminate()
          }
          else {
            assertNever(type)
          }
        },
        error: errHandler,
      })
    const taskMsgSubs = this._msgObs
      .filter(negate(upDownMsgFilter))
      .subscribe({
        next: (msg: serverMessage3<M, keyof M>) => {
          const id = msg.id
          const type: keyof M = msg.type
          const data: M[keyof M][0] = msg.data

          if (!objectHasKey(fns, type)) {
            assertNever(type)
          }

          type fnResult = M[keyof M][1]
          const handleData = (data: fnResult) => {
            const reply: clientMessage3<M, keyof M> = {
              from: messageFrom.client,
              type,
              id,
              data,
            }
            this._send(reply)
          }

          const res: fnResult | Promise<fnResult> = fns[type](data)
          if (res instanceof Promise) {
            res.then((d) => handleData(d))
          }
          else {
            handleData(res)
          }
        },
        error: errHandler,
      })

    this._unsubscribeEventsLoggers = () => {
      bExObsSubs.unsubscribe()
      disObsSubs.unsubscribe()
      extObsSubs.unsubscribe()
      msgObsSubs.unsubscribe()
      wrnObsSubs.unsubscribe()

      SIGINT_ObsSubs.unsubscribe()

      upDownMsgSubs.unsubscribe()
      taskMsgSubs.unsubscribe()
    }
  }

  private _send(msg: clientMessage3<M, keyof M> | startupMsg) {
    process.send!(msg)
  }

  private _terminate() {
    this.log('gracefully exiting')
    this._unsubscribeEventsLoggers()
    process.disconnect()
  }

  static init<M extends MessagesMap>(fnMap: WorkerFunctionsMap<M>) {
    if (!process.send) {
      throw new Error(`cannot require or run outside of 'fork()'`)
    }

    return new WorkerExecutor<M>(fnMap)
  }
}

WorkerExecutor.init<messages>({
  process: processLibrary,
  reanalyse: reanalyseLibrary,
})

/*
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
          // istanbul ignore next
          assertNever(msg.type)
        }
      }
    })
}
*/
