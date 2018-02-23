import { IDebugger } from 'debug'
import { negate } from 'lodash'
import { Server as NetServer, Socket as NetSocket } from 'net'
import Observable from 'zen-observable'
import { assertNever, objectHasKey } from '../index'
import { stdoutLog } from '../logger'
import { observableFromEventEmitter } from '../observable'
import {
  clientMessage3,
  FROM as messageFrom,
  MessagesMap,
  serverMessage3,
  shutdownMsg,
  startupMsg,
  WorkerFunctionsMap
} from './types'


type messagesFromServer<Msg extends MessagesMap, Type extends keyof Msg = keyof Msg> =
  startupMsg | shutdownMsg | serverMessage3<Msg, Type>
type msgHandle = NetSocket | NetServer | undefined

export class WorkerExecutor<M extends MessagesMap> {
  public log: IDebugger

  private _bExObs: Observable<number>
  private _disObs: Observable<void>
  private _extObs: Observable<number>
  private _msgObs: Observable<messagesFromServer<M>>
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
      .map(([msg, handle]: [messagesFromServer<M>, msgHandle]) => msg)
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
      (msg: messagesFromServer<M>) => msg.type === 'up' || msg.type === 'down'
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
        next: (msg: serverMessage3<M>) => {
          const id = msg.id
          const type: keyof M = msg.type
          const data: M[keyof M][0] = msg.data

          if (!objectHasKey(fns, type)) {
            assertNever(type)
          }

          type fnResult = M[keyof M][1]
          const handleData = (data: fnResult) => {
            const reply: clientMessage3<M> = {
              from: messageFrom.client,
              id,
              type,
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

  private _send(msg: clientMessage3<M> | startupMsg) {
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
