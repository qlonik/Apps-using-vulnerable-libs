import { readdir } from 'fs-extra'
import { partition, shuffle, filter, once } from 'lodash/fp'
import { join } from 'path'
import { resolveAllOrInParallel } from '../utils'
import { poolFactory } from '../utils/worker'
import { allMessages, DONE, MainFn, TerminateFn, WORKER_FILENAME } from './_all.types'

const DUMP_PATH = '../data/snyk/dump'
const LIBS_PATH = '../data/snyk/sample_libs'
const DATE = ''
const VERSIONS_PATH = ''

let terminating = false
export const main: MainFn = async function main(log) {
  const pool = poolFactory<allMessages>(join(__dirname, WORKER_FILENAME))
  const filenames = shuffle(
    filter((s) => !s.startsWith('_') && s.endsWith('.tgz'), await readdir(DUMP_PATH)),
  )

  log.info('started processing %o files', filenames.length)
  const results = await resolveAllOrInParallel(
    filenames.map((filename) => async () => {
      if (terminating) {
        return { done: DONE.fail, filename }
      }

      try {
        return {
          done: await pool.exec('extract-lib-from-dump', [
            { filename, libsPath: LIBS_PATH, dumpPath: DUMP_PATH, VERSIONS_PATH, DATE },
          ]),
          filename,
        }
      } catch (err) {
        log.error({ err }, 'error from child')
        return { done: DONE.fail, filename }
      }
    }),
    {
      chunkLimit: pool.maxWorkers + 1,
      chunkSize: Math.floor(1.5 * pool.maxWorkers),
    },
  )

  const [s, x] = partition(({ done }) => done === DONE.ok, results)
  const [eT, y] = partition(({ done }) => done === DONE.exclTime, x)
  const [eB, z] = partition(({ done }) => done === DONE.exclBL, y)
  const [fPN, f] = partition(({ done }) => done == DONE.failParseName, z)

  log.info({
    success: s.length,
    'excluded-by-time': eT.length,
    'excluded-by-blacklist': eB.length,
    'failed-to-parse-filename': fPN.length,
    failed: f.length,
  })

  await pool.terminate()
}

export const terminate: TerminateFn = once(() => {
  terminating = true
})
