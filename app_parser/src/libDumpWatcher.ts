import { watch } from 'chokidar'
import { createPool } from 'generic-pool'
import { inspect } from 'util'
import { analyseLibFiles, extractMainFiles, extractSingleLibraryFromDump } from './parseLibraries'
import { saveFiles } from './utils/files'
import debug = require('debug')
import Observable = require('zen-observable')


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
    const log = debug('chokidar')
    log.log = console.log.bind(console)

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
 * Logger setup
 */
debug.formatters.I = (v: any): string => {
  return inspect(v, { depth: Infinity, colors: true, breakLength: 50 })
    .split('\n').map((l) => '   ' + l).join('\n')
}
const log = debug('dump/*.tgz')
log.log = console.log.bind(console)

/*
 * Creating pool of analysis executors
 */
const executorsPool = createPool({
  create() {
    return Promise.resolve({})
  },
  destroy() {
    return Promise.resolve(undefined)
  }
}, { min: 2, max: 10 })

/*
 * Creating observable, watch only add events and reacting to them (by parsing libraries)
 */
watcherObservable({ pattern: WATCH_FOR, cwd: DUMP_PATH })
  .filter(({ event }) => event === 'add')
  .map(({ path }) => path)
  .subscribe({
    start: () => {
      log('started')
    },
    next: (filename) => {

      executorsPool.acquire().then(async (poolResource) => {
        try {
          log('got %o', filename)

          const { name, version } = await extractSingleLibraryFromDump({
            dumpPath: DUMP_PATH,
            libsPath: LIB_PATH,
            filename,
          })
          const main = await saveFiles(extractMainFiles({ libsPath: LIB_PATH, name, version }))
          const analysis = await saveFiles(analyseLibFiles(main))

          log([
            'finished %o' + (main.length ? '' : ' (no main files found!!!)'),
            '   main files:',
            '%I',
            '   analysis files:',
            '%I'
          ].join('\n'), filename, main, analysis)
        }
        catch (err) {
          log('errror\n%I\n%I', err, err.stack)
        }
        finally {
          executorsPool.release(poolResource)
        }
      })
    }
  })
