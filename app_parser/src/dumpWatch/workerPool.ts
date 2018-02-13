import { ChildProcess, fork } from "child_process"
import { IDebugger } from 'debug'
import { createPool, Pool } from 'generic-pool'
import { cpus } from "os"
import { relative } from "path"
import { stdoutLog } from '../utils/logger'
import { observableFromEventEmitter } from '../utils/observable'
import {
  clientMessage3,
  messageFrom,
  messages,
  MessagesMap,
  serverMessage3,
  shutdownMsg,
  startupMsg,
} from './common'
import uuid = require('uuid/v4')
import Observable = require('zen-observable')


const WORKER_PATH = relative(process.cwd(), require.resolve('./worker'))
const WORKER_MIN_AT_LEAST = 1
const WORKER_MAX_AT_LEAST = 3
const WORKER_EVICTION_TIMEOUT = 10 * 1000
const WORKER_IDLE_SHUTDOWN_TIMEOUT = 30 * 1000


/*
 * Promisified auto closed pool
 */
export const createAutoClosedPool = <T>(pool: Pool<T>) => {
  return async function <K>(fn: (resource: T) => Promise<K>): Promise<K> {
    const resource = await pool.acquire()
    try {
      return await fn(resource)
    }
    finally {
      pool.release(resource)
    }
  }
}

export class WorkerInstance<M extends MessagesMap> {
  static WORKER_STARTUP_TIMEOUT = 3 * 1000
  static WORKER_SHUTDOWN_TIMEOUT = 3 * 1000
  static BEGINNING_PORT = 23000

  private static size = 0

  public pid: number
  public log: IDebugger

  private _worker: ChildProcess

  private _errObs: Observable<Error>
  private _disObs: Observable<void>
  private _clsObs: Observable<[number, string]>
  private _extObs: Observable<[number, string]>
  private _msgObs: Observable<clientMessage3<M, keyof M>>

  private _eventsLog: IDebugger
  private _unsubscribeEventsLoggers: () => void

  constructor(worker: string) {
    const size = WorkerInstance.size++
    // rewrite debug port for child worker, if we started main process with IntelliJ debugger
    const execArgv = process.execArgv.map((el) => {
      if (!el.startsWith('--inspect')) {
        return el
      }
      return el.replace(/=(\d+)/, `=${WorkerInstance.BEGINNING_PORT + size}`)
    })

    this._worker = fork(worker, [], { execArgv })
    this.pid = this._worker.pid

    this._errObs = observableFromEventEmitter(this._worker, 'error')
      .map(([err]): Error => err)
    this._disObs = observableFromEventEmitter(this._worker, 'disconnect')
      .map((): void => {})
    this._clsObs = observableFromEventEmitter(this._worker, 'close')
      .map(([code, signal]): [number, string] => ([code, signal]))
    this._extObs = observableFromEventEmitter(this._worker, 'exit')
      .map(([code, signal]): [number, string] => ([code, signal]))
    this._msgObs = observableFromEventEmitter(this._worker, 'message')
      .map(([msg]): clientMessage3<M, keyof M> => msg)

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

  send<T extends keyof M>(type: T, data: M[T][0]): Promise<M[T][1]> {
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

        const subscription = this._msgObs
          .filter(({ id }) => id === serverMsg.id)
          .subscribe({
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

        const subscription = this._msgObs
          .filter(({ id }) => id === data.id)
          .subscribe({
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

        const subscription = this._extObs
          .subscribe({
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
    WorkerInstance.size--
    this._unsubscribeEventsLoggers()
  }

  static async create<T extends MessagesMap>(worker: string) {
    const w = new WorkerInstance<T>(worker)

    const timeout = () => new Promise<never>((_, reject) => {
      setTimeout(reject, this.WORKER_STARTUP_TIMEOUT, new Error('startup timed-out'))
    })
    const startWorker = async () => {
      return w._sendStartup()
    }

    try {
      await Promise.race([timeout(), startWorker()])
      w.log('started')
      return w
    }
    catch (err) {
      w.log(`Error during creation: '${err.message}'. Destroying...\n${err.stack}`)
      await WorkerInstance.destroy(w)
      throw err
    }
  }

  static async destroy(w: WorkerInstance<any>): Promise<undefined> {
    const timeout = () => new Promise<never>((_, reject) => {
      setTimeout(reject, this.WORKER_SHUTDOWN_TIMEOUT, new Error('graceful shutdown timed-out'))
    })
    const stopWorker = async (worker: WorkerInstance<any>) => {
      return worker._sendShutdown()
    }

    try {
      const [code, signal] = <[number, string]> await Promise.race([timeout(), stopWorker(w)])
      w.log('exited (code, signal)=(%o, %o)', code, signal)
      return
    }
    catch (err) {
      w.log(`Error during destruction: '${err.message}'. Killing...\n${err.stack}`)
      w._kill()
      return
    }
    finally {
      w._cleanup()
    }
  }
}

/*
 * Creating pool of analysis executors
 */
const maxCPUs = cpus().length
export const workerPool = createPool<WorkerInstance<messages>>({
  create: () => WorkerInstance.create(WORKER_PATH),
  destroy: (w) => WorkerInstance.destroy(w),
}, {
  min: Math.max(Math.floor((maxCPUs - 1) / 2), WORKER_MIN_AT_LEAST),
  max: Math.max(maxCPUs - 1, WORKER_MAX_AT_LEAST),
  evictionRunIntervalMillis: WORKER_EVICTION_TIMEOUT,
  softIdleTimeoutMillis: WORKER_IDLE_SHUTDOWN_TIMEOUT,
  idleTimeoutMillis: Infinity,
})
