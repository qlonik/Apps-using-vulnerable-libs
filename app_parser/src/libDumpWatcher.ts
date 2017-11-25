import { watch } from 'chokidar'
import { createPool } from 'generic-pool'
import { inspect } from 'util'
import { analyseLibFiles, extractMainFiles, extractSingleLibraryFromDump } from './parseLibraries'
import { saveFiles } from './utils/files'
import { createAutoClosedPool } from './utils/pool'
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

  return async <T>(worker: T) => {

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
      return
    }

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
}

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
      const p = useExecutorsPool(processLibrary({
        filename,
        libsPath: LIB_PATH,
        dumpPath: DUMP_PATH,
      }))
    }
  })
