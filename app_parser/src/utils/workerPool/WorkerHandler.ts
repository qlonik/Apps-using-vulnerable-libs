import { ChildProcess, fork } from 'child_process'
import { IDebugger } from 'debug'
import uuid from 'uuid/v4'
import Observable from 'zen-observable'
import { stdoutLog } from '../logger'
import { observableFromEventEmitter } from '../observable'
import {
  clientMessage3,
  FROM as messageFrom,
  MessagesMap,
  serverMessage3,
  shutdownMsg,
  startupMsg,
} from './types'

export class WorkerHandler<M extends MessagesMap> {
  public static WORKER_STARTUP_TIMEOUT = 3 * 1000
  public static WORKER_SHUTDOWN_TIMEOUT = 3 * 1000
  public static BEGINNING_PORT = 23000

  private static _size = 0

  public pid: number
  public log: IDebugger

  private _worker: ChildProcess

  private _errObs: Observable<Error>
  private _disObs: Observable<void>
  private _clsObs: Observable<[number, string]>
  private _extObs: Observable<[number, string]>
  private _msgObs: Observable<clientMessage3<M>>

  private _eventsLog: IDebugger

  private constructor(worker: string) {
    const size = WorkerHandler._size++
    // rewrite debug port for child worker, if we started main process with IntelliJ debugger
    const execArgv = process.execArgv.map((el) => {
      if (!el.startsWith('--inspect')) {
        return el
      }
      return el.replace(/=(\d+)/, `=${WorkerHandler.BEGINNING_PORT + size}`)
    })

    this._worker = fork(worker, [], { execArgv })
    this.pid = this._worker.pid

    this._errObs = observableFromEventEmitter(this._worker, 'error').map(([err]: [Error]) => err)
    this._disObs = observableFromEventEmitter(this._worker, 'disconnect').map(() => {})
    this._clsObs = observableFromEventEmitter(this._worker, 'close').map(
      ([code, signal]: [number, string]) => [code, signal] as [number, string],
    )
    this._extObs = observableFromEventEmitter(this._worker, 'exit').map(
      ([code, signal]: [number, string]) => [code, signal] as [number, string],
    )
    this._msgObs = observableFromEventEmitter(this._worker, 'message').map(
      ([msg]: [clientMessage3<M>]) => msg,
    )

    this.log = stdoutLog(`w_instance:${this._worker.pid}`)
    this._eventsLog = stdoutLog(`${this.log.namespace}:ev`)

    const errObsSubs = this._errObs.subscribe((err) => {
      this._eventsLog('error (name, message)=(%o, %o)\n%I', err.name, err.message, err)
    })
    const disObsSubs = this._disObs.subscribe(() => {
      this._eventsLog('disconnected')
    })
    const clsObsSubs = this._clsObs.subscribe(([code, signal]) => {
      this._eventsLog('closed (code, signal)=(%o, %o)', code, signal)
    })
    const extObsSubs = this._extObs.subscribe(([code, signal]) => {
      this._eventsLog('exited (code, signal)=(%o, %o)', code, signal)
    })
    const msgObsSubs = this._msgObs.subscribe((message) => {
      this._eventsLog('msg %o', message)
    })

    this._unsubscribeEventsLoggers = () => {
      errObsSubs.unsubscribe()
      disObsSubs.unsubscribe()
      clsObsSubs.unsubscribe()
      extObsSubs.unsubscribe()
      msgObsSubs.unsubscribe()
    }
  }

  private _unsubscribeEventsLoggers: () => void

  private _sendStartup() {
    const data: startupMsg = {
      id: uuid(),
      type: 'up',
    }

    return new Promise((resolve, reject) => {
      this._worker.send(data, (err) => {
        if (err) {
          return reject('error sending message')
        }

        const subscription = this._msgObs.filter(({ id }) => id === data.id).subscribe({
          next() {
            subscription.unsubscribe()
            resolve()
          },
          error(err) {
            subscription.unsubscribe()
            reject(`error in _sendStartup(): ${err.message}\n${err.stack}`)
          },
        })
      })
    })
  }

  private _sendShutdown() {
    const data: shutdownMsg = {
      id: uuid(),
      type: 'down',
    }

    return new Promise((resolve, reject) => {
      this._worker.send(data, (err) => {
        if (err) {
          return reject('error sending message')
        }

        const subscription = this._extObs.subscribe({
          next(extCode) {
            subscription.unsubscribe()
            resolve(extCode)
          },
          error(err) {
            subscription.unsubscribe()
            reject(`error in _sendShutdown(): ${err.message}\n${err.stack}`)
          },
        })
      })
    })
  }

  private _kill() {
    this._worker.kill()
  }

  private _cleanup() {
    WorkerHandler._size--
    this._unsubscribeEventsLoggers()
  }

  public send<T extends keyof M>(type: T, data: M[T][0]): Promise<M[T][1]> {
    const serverMsg: serverMessage3<M, T> = {
      from: messageFrom.server,
      id: uuid(),
      type,
      data,
    }

    return new Promise((resolve, reject) => {
      this._worker.send(serverMsg, (err) => {
        if (err) {
          return reject('error sending message')
        }

        const subscription = this._msgObs.filter(({ id }) => id === serverMsg.id).subscribe({
          next(msg: clientMessage3<M, T>) {
            subscription.unsubscribe()
            resolve(msg.data)
          },
          error(err) {
            subscription.unsubscribe()
            reject(`error in send(): ${err.message}\n${err.stack}`)
          },
        })
      })
    })
  }

  public static async create<T extends MessagesMap>(worker: string) {
    const w = new WorkerHandler<T>(worker)

    const timeout = () =>
      new Promise<never>((resolve, reject) => {
        setTimeout(reject, this.WORKER_STARTUP_TIMEOUT, new Error('startup timed-out'))
      })
    const startWorker = async () => {
      return w._sendStartup()
    }

    try {
      await Promise.race([timeout(), startWorker()])
      w.log('started')
      return w
    } catch (err) {
      w.log(`Error during creation: '${err.message}'. Destroying...\n${err.stack}`)
      await WorkerHandler.destroy(w)
      throw err
    }
  }

  public static async destroy(w: WorkerHandler<any>): Promise<undefined> {
    const timeout = () =>
      new Promise<never>((resolve, reject) => {
        setTimeout(reject, this.WORKER_SHUTDOWN_TIMEOUT, new Error('graceful shutdown timed-out'))
      })
    const stopWorker = async (worker: WorkerHandler<any>) => {
      return worker._sendShutdown()
    }

    try {
      const [code, signal] = (await Promise.race([timeout(), stopWorker(w)])) as [number, string]
      w.log('exited (code, signal)=(%o, %o)', code, signal)
      return
    } catch (err) {
      w.log(`Error during destruction: '${err.message}'. Killing...\n${err.stack}`)
      w._kill()
      return
    } finally {
      w._cleanup()
    }
  }
}
