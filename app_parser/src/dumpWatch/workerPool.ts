import { ChildProcess, fork } from "child_process"
import { IDebugger } from 'debug'
import { createPool, Pool } from 'generic-pool'
import { cpus } from "os"
import { relative } from "path"
import { stdoutLog } from '../utils/logger'
import { observableFromEventEmitter } from '../utils/observable'
import {
  clientMessage,
  clientMessage2Data,
  clientMessageType,
  LOG_NAMESPACE,
  messageFrom,
  serverMessage,
  serverMessage2Data,
  serverMessageType
} from './common'
import Timer = NodeJS.Timer
import uuid = require('uuid/v4')
import Observable = require('zen-observable')


const WORKER_PATH = relative(process.cwd(), require.resolve('./worker'))
const WORKER_MIN_AT_LEAST = 1
const WORKER_MAX_AT_LEAST = 3
const WORKER_EVICTION_TIMEOUT = 10 * 1000
const WORKER_IDLE_SHUTDOWN_TIMEOUT = 30 * 1000
const WORKER_STARTUP_TIMEOUT = 3 * 1000
const WORKER_SHUTDOWN_TIMEOUT = 3 * 1000
const WORKER_WORKING_SHUTDOWN_TIMEOUT = 30 * 1000
const BEGINNING_PORT = 23000


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

type msgFromWorker = { from: messageFrom.client, id: string, data: clientMessage2Data }
export class WorkerInstance {
  static WORKER_STARTUP_TIMEOUT = 3 * 1000
  static WORKER_SHUTDOWN_TIMEOUT = 3 * 1000

  private static size = -1

  public pid: number
  public log: IDebugger

  private _worker: ChildProcess

  private _errObs: Observable<Error>
  private _disObs: Observable<void>
  private _clsObs: Observable<[number, string]>
  private _extObs: Observable<[number, string]>
  private _msgObs: Observable<msgFromWorker>

  private _eventsLog: IDebugger
  private _unsubscribeEventsLoggers: () => void

  constructor(worker: string = WORKER_PATH, log: string = LOG_NAMESPACE) {
    const size = ++WorkerInstance.size
    // rewrite debug port for child worker, if we started main process with IntelliJ debugger
    const execArgv = process.execArgv.map((el) => {
      if (!el.startsWith('--inspect')) {
        return el
      }
      return el.replace(/=(\d+)/, `=${BEGINNING_PORT + size}`)
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
      .map(([msg]): msgFromWorker => msg)

    this.log = stdoutLog(`${log}:worker:${this._worker.pid}`)
    this._eventsLog = stdoutLog(this.log.namespace + ':ev')
    this._eventsLog.enabled = false

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

  send(msg: serverMessage2Data): Promise<clientMessage2Data> {
    const data = {
      from: messageFrom.server,
      id: uuid(),
      data: msg,
    }

    return new Promise((resolve, reject) => {
      this._worker.send(data, (err) => {
        if (err) {
          return reject('error sending message')
        }

        const subscription = this._msgObs
          .filter(({ id }) => id === data.id)
          .subscribe({
            next(msg: msgFromWorker) {
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

  private _sendShutdown() {
    const data = {
      from: messageFrom.server,
      id: uuid(),
      data: {
        type: serverMessageType.shutdown,
      },
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

  static async create(worker: string = WORKER_PATH, log: string = LOG_NAMESPACE) {
    const w = new WorkerInstance(worker, log)

    const timeout = () => new Promise<never>((_,reject) => {
      setTimeout(reject, this.WORKER_STARTUP_TIMEOUT, new Error('startup timed-out'))
    })
    const startWorker = async () => {
      const res = <clientMessage2Data> await w.send({ type: serverMessageType.startup })

      if (res.type !== clientMessageType.startupDone) {
        throw new Error('something is wrong')
      }

      w.log('started')
      return w
    }

    try {
      return <WorkerInstance> await Promise.race([timeout(), startWorker()])
    }
    catch (err) {
      w.log(`Error during creation: '${err.message}'. Destroying...\n${err.stack}`)
      await WorkerInstance.destroy(w)
      throw err
    }
  }

  static async destroy(w: WorkerInstance): Promise<undefined> {
    const timeout = () => new Promise<never>((_, reject) => {
      setTimeout(reject, this.WORKER_SHUTDOWN_TIMEOUT, new Error('graceful shutdown timed-out'))
    })
    const stopWorker = async (worker: WorkerInstance) => {
      return worker._sendShutdown()
    }

    try {
      const [code, signal] = <[number, string]> await Promise.race([timeout(), stopWorker(w)])
      w.log('exited (code, signal)=(%o, %o)', code, signal)
      return
    }
    catch (err) {
      w._kill()
      w.log(`Error during destruction: '${err.message}'. Killing...\n${err.stack}`)
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
export type ChildProcessWithLog = ChildProcess & { __log: IDebugger }

const maxCPUs = cpus().length
export const workerPool = createPool<ChildProcessWithLog>({
  create() {
    return new Promise((resolve, reject) => {
      // rewrite debug port for child worker, if we started main process with IntelliJ debugger
      const execArgv = process.execArgv.map((el) => {
        if (!el.startsWith('--inspect')) {
          return el
        }
        const port = '2300' + (workerPool && workerPool.size || '0')
        return el.replace(/=(\d+)/, `=${port}`)
      })
      const worker = <ChildProcessWithLog>fork(WORKER_PATH, [], { execArgv })
      const log = stdoutLog(`${LOG_NAMESPACE}:worker:${worker.pid}`)
      worker.__log = log

      const rejectTimeout = setTimeout(() => {
        worker.kill()
        log('startup timed out, killing...')
        reject(new Error('Startup timed out'))
      }, WORKER_STARTUP_TIMEOUT)

      const evLog = stdoutLog(log.namespace + ':ev')
      evLog.enabled = false
      worker.on('error', (err) => {
        evLog('error (name, message)=(%o, %o)\n%I', err.name, err.message, err)
      })
      worker.on('disconnect', () => {
        evLog('disconnected')
      })
      worker.on('close', (code, signal) => {
        evLog('closed (code, signal)=(%o, %o)', code, signal)
      })
      worker.on('exit', (code, signal) => {
        evLog('exited (code, signal)=(%o, %o)', code, signal)
      })
      worker.on('message', (message) => {
        evLog('msg %o', message)
      })

      worker.send(<serverMessage>{
        from: messageFrom.server,
        type: serverMessageType.startup
      }, (err) => {

        if (err) {
          clearTimeout(rejectTimeout)
          worker.kill()
          log('error while sending %o message:\n%I',
            serverMessageType[serverMessageType.startup],
            err)
          return reject(err)
        }

        worker.once('message', (msg: clientMessage) => {
          if (msg.type === clientMessageType.startupDone) {
            clearTimeout(rejectTimeout)
            log('started')
            resolve(worker)
          }
        })
      })
    })
  },
  destroy(worker: ChildProcessWithLog) {
    const log = worker.__log

    worker.send(<serverMessage>{
      from: messageFrom.server,
      type: serverMessageType.shutdown,
    })
    return new Promise((resolve) => {
      const killFn = () => {
        worker.kill()
        log('graceful shutdown timed out, killing...')
        resolve()
      }
      const killTimeout = setTimeout(killFn, WORKER_SHUTDOWN_TIMEOUT)
      let longKillTimeout: Timer | null = null
      const onMsgFn = (msg: clientMessage) => {
        // remark: don't need to deal with shutdown during work case
        // this is because the resource will not be released before work is finished
        // therefore the worker cannot be killed before it is released
        if (msg.type === clientMessageType.delayShutdown) {
          log('received request to delay shutdown')
          clearTimeout(killTimeout)
          longKillTimeout = setTimeout(killFn, WORKER_WORKING_SHUTDOWN_TIMEOUT)
        }
      }
      worker.once('message', onMsgFn)
      worker.once('exit', (code, signal) => {
        log('exited (code, signal)=(%o, %o)', code, signal)
        if (longKillTimeout) {
          clearTimeout(longKillTimeout)
        }
        else {
          clearTimeout(killTimeout)
          worker.removeListener('message', onMsgFn)
        }
        resolve()
      })
    })
  }
}, {
  min: Math.max(Math.floor((maxCPUs - 1) / 2), WORKER_MIN_AT_LEAST),
  max: Math.max(maxCPUs - 1, WORKER_MAX_AT_LEAST),
  evictionRunIntervalMillis: WORKER_EVICTION_TIMEOUT,
  softIdleTimeoutMillis: WORKER_IDLE_SHUTDOWN_TIMEOUT,
  idleTimeoutMillis: Infinity,
})
