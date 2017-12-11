import { ChildProcess, fork } from "child_process"
import { IDebugger } from 'debug'
import { createPool, Pool } from 'generic-pool'
import { cpus } from "os"
import { relative } from "path"
import { stdoutLog } from '../utils/logger'
import { LOG_NAMESPACE } from './index'
import {
  clientMessage,
  clientMessageType,
  messageFrom,
  serverMessage,
  serverMessageType
} from './common'
import Timer = NodeJS.Timer


const WORKER_PATH = relative(process.cwd(), require.resolve('./worker'))
const WORKER_MIN_AT_LEAST = 1
const WORKER_MAX_AT_LEAST = 3
const WORKER_EVICTION_TIMEOUT = 10 * 1000
const WORKER_IDLE_SHUTDOWN_TIMEOUT = 30 * 1000
const WORKER_STARTUP_TIMEOUT = 3 * 1000
const WORKER_SHUTDOWN_TIMEOUT = 3 * 1000
const WORKER_WORKING_SHUTDOWN_TIMEOUT = 30 * 1000


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
