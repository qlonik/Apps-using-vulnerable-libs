import { once, includes, sortBy } from 'lodash'
import { join } from 'path'
import { The } from 'typical-mini'
import { MessagesMap } from 'workerpool'
import { analysisFile, appDesc, getApps } from '../parseApps'
import { FOUND_LIBS_REGEX_FILE } from '../parseApps/constants'
import { resolveAllOrInParallel } from '../utils'
import { myWriteJSON } from '../utils/files'
import { stdoutLog } from '../utils/logger'
import { getWorkerPath, poolFactory } from '../utils/worker'
import { MainFn, TerminateFn } from './_all.types'

const log = stdoutLog('find-most-used-libs')
log.enabled = true

export type foundLibs = [string, { count: number; versions: string[] }]
export type messages = The<
  MessagesMap,
  {
    findLibsWithRegex: [
      [{ allAppsPath: string; app: appDesc }],
      false | ({ file: analysisFile; libs: foundLibs[] }[])
    ]
  }
>

const APPS_PATH = '../data/sample_apps'
const FOUND_LIBS = join(APPS_PATH, FOUND_LIBS_REGEX_FILE)

let terminating = false

export const main: MainFn = async () => {
  const wPath = await getWorkerPath(__filename)
  const apps = await getApps(APPS_PATH)

  if (terminating) {
    return
  }

  const pool = poolFactory<messages>(wPath, { minWorkers: 0 })
  log('pool: min=%o, max=%o, %o', pool.minWorkers, pool.maxWorkers, pool.stats())

  const appsPromises = apps.map((app) => async () => {
    if (terminating) {
      return { ...app, found: false }
    }
    const found = await pool.exec('findLibsWithRegex', [{ app, allAppsPath: APPS_PATH }])
    return { ...app, found }
  })

  log('started search')
  const results = await resolveAllOrInParallel(appsPromises, {
    chunkLimit: pool.maxWorkers + 1,
    chunkSize: Math.floor(1.5 * pool.maxWorkers),
  })
  if (terminating) {
    log('terminated search')
  } else {
    log('finished search')
  }

  const countsMap = results.reduce((acc, { found }) => {
    if (!Array.isArray(found)) {
      return acc
    }

    for (let { libs } of found) {
      for (let [name, { count: fCount, versions: fVersions }] of libs) {
        const { count, versions } = acc.get(name) || { count: 0, versions: [] }

        for (let fVersion of fVersions) {
          if (!includes(versions, fVersion)) {
            versions.push(fVersion)
          }
        }

        acc.set(name, { count: count + fCount, versions })
      }
    }
    return acc
  }, new Map<foundLibs[0], foundLibs[1]>())
  const counts = sortBy([...countsMap], (o) => -o[1].count)

  await myWriteJSON({ file: FOUND_LIBS, content: { counts, results } })
  await pool.terminate()
}

export const terminate: TerminateFn = once(() => {
  log('started terminating')
  terminating = true
})
