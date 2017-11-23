import { watch } from 'chokidar'
import { analyseLibFiles, extractMainFiles, extractSingleLibraryFromDump } from './parseLibraries'
import { saveFiles } from './utils/files'
import debug = require('debug')
import Observable = require('zen-observable')


const LIB_PATH = '../data/sample_libs'
const DUMP_PATH = '../data/lib_dump'
const WATCH_FOR = '*.tgz'

const CONSERVATIVE = false

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

const log = debug('dump/*.tgz')
log.log = console.log.bind(console)

watcherObservable({ pattern: WATCH_FOR, cwd: DUMP_PATH })
  .filter(({ event }) => event === 'add')
  .map(({ path }) => path)
  .subscribe({
    start: () => {
      log('started')
    },
    next: async (filename) => {
      // todo: maybe add pool of executors
      log('got %o', filename)
      try {
        const libDesc = await extractSingleLibraryFromDump({
          dumpPath: DUMP_PATH,
          libsPath: LIB_PATH,
          filename,
        })
        const mainFiles = await extractMainFiles({ libsPath: LIB_PATH, libDesc })
        const savedMainFiles = await saveFiles(mainFiles)
        const analysisFiles = await analyseLibFiles(savedMainFiles)
        const savedAnalysisFiles = await saveFiles(analysisFiles)
        log('finished %o', filename)
      } catch (err) {
        log('errror\n%O\n%O', err, err.stack)
      }
    }
  })
