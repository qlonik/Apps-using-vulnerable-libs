import { watch } from 'chokidar'
import { once } from 'lodash'
import Observable from 'zen-observable'
import { stdoutLog } from '../utils/logger'
import { createAutoClosedPool, WorkerInstance } from '../utils/workerPool'
import { LOG_NAMESPACE, messages, processRequest } from './common'
import { workerPool } from './workerPool'


const LIB_PATH = '../data/sample_libs'
const DUMP_PATH = '../data/lib_dump'
const WATCH_FOR = '*.tgz'

const CONSERVATIVE = false

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
 * Creating auto-closing worker pool
 */
const useExecutorsPool = createAutoClosedPool(workerPool)

/*
 * function performed by each executor
 */
const processLibrary = ({ filename, libsPath, dumpPath }: processRequest) => {
  return async (worker: WorkerInstance<messages>) => {
    // log('(w:%o) got %o', worker.pid, filename)

    const { main, analysis } = await worker.send('process', { dumpPath, libsPath, filename })

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
  workerPool.drain()
    .then(() => workerPool.clear())
    .then(() => log('exited'))
}))
