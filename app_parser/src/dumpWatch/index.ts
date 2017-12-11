import { ChildProcess, fork } from 'child_process'
import { watch } from 'chokidar'
import { IDebugger } from 'debug'
import { createPool } from 'generic-pool'
import { once } from 'lodash'
import { cpus } from 'os'
import { inspect } from 'util'
import { fileDesc } from '../utils/files'
import { createAutoClosedPool } from '../utils/pool'
import {
  clientMessage,
  clientMessageType,
  messageFrom,
  serverMessage,
  serverMessageType,
} from './dumpWatchWorker'
import debug = require('debug')
import Observable = require('zen-observable')
import Timer = NodeJS.Timer


const LOG_NAMESPACE = 'wtchr'

const LIB_PATH = '../data/sample_libs'
const DUMP_PATH = '../data/lib_dump'
const WATCH_FOR = '*.tgz'

const WORKER_MIN_AT_LEAST = 1
const WORKER_MAX_AT_LEAST = 3
const WORKER_EVICTION_TIMEOUT = 10 * 1000
const WORKER_IDLE_SHUTDOWN_TIMEOUT = 30 * 1000
const WORKER_STARTUP_TIMEOUT = 3 * 1000
const WORKER_SHUTDOWN_TIMEOUT = 3 * 1000
const WORKER_WORKING_SHUTDOWN_TIMEOUT = 30 * 1000

const CONSERVATIVE = false

/*
 * Logger setup
 */
debug.formatters.I = (v: any): string => {
  return inspect(v, { depth: Infinity, colors: true, breakLength: 50 })
    .split('\n').map((l) => '   ' + l).join('\n')
}
const stdoutLog = (namespace: string): IDebugger => {
  const log = debug(namespace)
  log.log = console.log.bind(console)
  return log
}

/*
 * Creating observable out of event emitter to catch all events
 */
type eventDesc = { event: string, path: string }
const watcherObservable = ({ pattern, cwd }: { pattern: string, cwd: string }) => {
  return new Observable<eventDesc>((observer) => {
    const log = stdoutLog(`${LOG_NAMESPACE}:chokidar`)
    log.enabled = false

    log('started')
    const watcher = watch(pattern, { cwd })
    watcher.once('ready', () => {
      log('initial scan finished')
    })
    watcher.on('error', (err) => {
      log('error %O', err)
      observer.error(err)
    })
    watcher.on('all', (event, path) => {
      log('%s %o', event, path)
      observer.next({ event, path })
    })
    return () => {
      watcher.close()
      log('closed')
    }
  })
}

/*
 * Creating pool of analysis executors
 */
type ChildProcessWithLog = ChildProcess & { __log: IDebugger }
const maxCPUs = cpus().length
const executorsPool = createPool<ChildProcessWithLog>({
  create() {
    return new Promise((resolve, reject) => {
      // rewrite debug port for child worker, if we started main process with IntelliJ debugger
      const execArgv = process.execArgv.map((el) => {
        if (!el.startsWith('--inspect')) {
          return el
        }
        const port = '2300' + (executorsPool && executorsPool.size || '0')
        return el.replace(/=(\d+)/, `=${port}`)
      })
      const worker = <ChildProcessWithLog>fork(require.resolve('./dumpWatchWorker'),
        [], { execArgv })
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
const useExecutorsPool = createAutoClosedPool(executorsPool)

/*
 * function performed by each executor
 */
const processLibrary = ({
  filename,
  libsPath,
  dumpPath,
}: {
  filename: string,
  libsPath: string,
  dumpPath: string,
}) => {

  return async (worker: ChildProcessWithLog) => {

    // log('(w:%o) got %o', worker.pid, filename)

    worker.send(<serverMessage>{
      from: messageFrom.server,
      type: serverMessageType.process,
      dumpPath,
      libsPath,
      filename,
    })

    type processingResult = { filename: string, main?: fileDesc[], analysis?: fileDesc[] }

    const { main, analysis } = await new Promise<processingResult>(((resolve, reject) => {
      worker.once('message', (msg: clientMessage) => {
        if (msg.type === clientMessageType.processingResult) {
          resolve({ filename: msg.filename, main: msg.main, analysis: msg.analysis })
        }
        else {
          reject(new Error('wrong message type received'))
        }
      })
    }))

    if (!main || !analysis) {
      log('(w:%o) The file %o left untouched. Could not parse filename', worker.pid, filename)
    }
    else {
      log('(w:%o) finished %o'
          + (main.length ? '' : ' (no main files found!!!)')
          + ' %o',
        worker.pid, filename, { main, analysis })
    }
  }
}

/*
 * Creating observable, watch only add events and reacting to them (by parsing libraries)
 */
const log = stdoutLog(LOG_NAMESPACE)
const subscription = watcherObservable({ pattern: WATCH_FOR, cwd: DUMP_PATH })
  .filter(({ event }) => event === 'add')
  .map(({ path }) => path)
  .subscribe({
    start: () => {
      log('started')
    },
    next: (filename) => {
      const p = useExecutorsPool(processLibrary({
        filename,
        libsPath: LIB_PATH,
        dumpPath: DUMP_PATH,
      }))
    }
  })

process.on('SIGINT', once(() => {
  log('SIGINT received. exiting...')

  subscription.unsubscribe()
  executorsPool.drain()
    .then(() => executorsPool.clear())
    .then(() => log('exited'))
}))
