import { join } from 'path'
import { The } from 'typical-mini'
import { once } from 'lodash'
import { MessagesMap } from 'workerpool'
import { analysisFile, appDesc, getApps } from '../../parseApps'
import { FOUND_LIBS_FILE } from '../../parseApps/constants'
import { getLibNames } from '../../parseLibraries'
import { resolveAllOrInParallel } from '../../utils'
import { myWriteJSON } from '../../utils/files'
import { stdoutLog } from '../../utils/logger'
import { getWorkerPath, poolFactory } from '../../utils/worker'
import { MainFn, TerminateFn } from '../_all.types'

const log = stdoutLog('find-most-used-libs')
log.enabled = true

export type messages = The<
  MessagesMap,
  {
    findLibs: [
      [{ allAppsPath: string; libNamesArr: string[]; app: appDesc }],
      false | { file: analysisFile; libs: string[] }[]
    ]
  }
>

export const environment = {
  APPS_PATH: {},
  LIBS_PATH: {},
}

let terminating = false
export const main: MainFn<typeof environment> = async (_, { OUT, APPS_PATH, LIBS_PATH }) => {
  const FOUND_LIBS = join(OUT, FOUND_LIBS_FILE)
  const wPath = await getWorkerPath(__filename)
  const apps = await getApps(APPS_PATH)

  if (terminating) {
    return
  }

  const libNamesArr = (await getLibNames(LIBS_PATH)).map(({ name }) => name)

  const pool = poolFactory(wPath, { minWorkers: 0 })
  log('pool: min=%o, max=%o, %o', pool.minWorkers, pool.maxWorkers, pool.stats())

  const appsPromises = apps.map((app) => async () => {
    if (terminating) {
      return { ...app, found: false }
    }
    const found = await pool.exec('findLibs', [{ app, libNamesArr, allAppsPath: APPS_PATH }])
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

  const distinct = results.reduce((acc, { found }) => {
    if (Array.isArray(found)) {
      found.forEach(({ libs }) => {
        libs.forEach((s: string) => acc.add(s))
      })
    }
    return acc
  }, new Set<string>())

  await myWriteJSON({ file: FOUND_LIBS, content: { distinct: [...distinct], results } })
  await pool.terminate()
}

export const terminate: TerminateFn = () =>
  once(() => {
    log('started terminating')
    terminating = true
  })
