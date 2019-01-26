import { readdir, remove } from 'fs-extra'
import { partition, shuffle, filter, once, isEqual, prop } from 'lodash/fp'
import { join } from 'path'
import { getLibNames } from '../parseLibraries'
import { poolFactory } from '../utils/worker'
import { allMessages, DONE, MainFn, TerminateFn, WORKER_FILENAME } from './_all.types'

const DUMP_DIR = 'dump'
const LIBS_DIR = 'sample_libs'

let terminating = false

export const environment = {
  /**
   * Working folder for lib extraction.
   *
   * Should contain 'dump' folder. If 'dump' cannot be copied/moved into here, it can be a symbolic
   * link to the real location.
   *
   * Should have write access. Folders 'dump.excl', 'dump.failed', 'dump.empty-sig', and
   * 'sample_libs' will be created.
   *
   * @example
   *   './data/libs/snyk'
   */
  WORK_FOLDER: {},
  /**
   * Cut off date. If library is published after this date, it is not considered for analysis.
   *
   * @example ```js
   * const DATE = '2018-04-26'
   * ```
   */
  CUTOFF_DATE: {},
  /**
   * File containing CouchDB dump of libraries, versions and when they were published
   *
   * @example ```js
   *   const VERSIONS_PATH = './data/logs/RIPPLE/npm-db-dump/click0/2018-07-10T07:18:54.941Z/formatted-liblibNamesVersions.json'
   * ```
   */
  VERSIONS_PATH: {},
}

export const main: MainFn<typeof environment> = async function main(
  log,
  { WORK_FOLDER: workDir, CUTOFF_DATE: DATE, VERSIONS_PATH },
) {
  const DUMP_PATH = join(workDir, DUMP_DIR)
  const LIBS_PATH = join(workDir, LIBS_DIR)

  const pool = poolFactory<allMessages>(join(__dirname, WORKER_FILENAME))
  const filenames = shuffle(
    filter((s) => !s.startsWith('_') && s.endsWith('.tgz'), await readdir(DUMP_PATH)),
  )

  log.info('started processing %o files', filenames.length)
  const results = await Promise.all(
    filenames.map(async (filename) => {
      if (terminating) {
        return { done: DONE.fail, filename }
      }

      return {
        done: await pool.exec('extract-lib-from-dump', [
          { filename, libsPath: LIBS_PATH, dumpPath: DUMP_PATH, VERSIONS_PATH, DATE },
        ]),
        filename,
      }
    }),
  )

  const partBy: (x: DONE) => (y: { done: DONE; filename: string }) => boolean = (x) => (y) =>
    isEqual(x, prop('done', y))
  const [s, x] = partition(partBy(DONE.ok), results)
  const [eT, y] = partition(partBy(DONE.exclTime), x)
  const [eB, z] = partition(partBy(DONE.exclBL), y)
  const [eS, w] = partition(partBy(DONE.emptySig), z)
  const [fPN, f] = partition(partBy(DONE.failParseName), w)

  log.info({
    success: s.length,
    'excluded-by-time': eT.length,
    'excluded-by-blacklist': eB.length,
    'empty-signatures': eS.length,
    'failed-to-parse-filename': fPN.length,
    failed: f.length,
  })

  await Promise.all(
    (await readdir(LIBS_PATH))
      .filter((x) => !x.startsWith('_'))
      .map(async (name) => {
        const libPath = join(LIBS_PATH, name)
        const content = await readdir(libPath)
        if (content.length === 0 || content.every((x) => x.startsWith('_'))) {
          await remove(libPath)
        }
      }),
  )

  await Promise.all(
    (await getLibNames(LIBS_PATH)).map(async ({ name }) => ({
      done: terminating
        ? false
        : await pool.exec('create-lib-literal-sig', [{ libsPath: LIBS_PATH, name }]),
      name,
    })),
  )

  await pool.terminate()
}

export const terminate: TerminateFn = (log) =>
  once(() => {
    log.info('started terminating')
    terminating = true
  })
