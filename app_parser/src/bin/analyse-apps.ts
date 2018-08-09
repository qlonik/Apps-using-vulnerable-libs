import { pathExists, readJSON } from 'fs-extra'
import { differenceWith, isEqual, once, partition, shuffle, take } from 'lodash/fp'
import { join } from 'path'
import { analyseCordovaApp, APP_TYPES, appDesc } from '../parseApps'
import { FINISHED_ANALYSIS_FILE, FINISHED_PREPROCESSING_FILE } from '../parseApps/constants'
import { FN_MATCHING_METHODS_TYPE } from '../similarityIndex/similarity-methods'
import { assertNever, resolveAllOrInParallel } from '../utils'
import { myWriteJSON } from '../utils/files'
import { poolFactory } from '../utils/worker'
import { allMessages, MainFn, TerminateFn, WORKER_FILENAME } from './_all.types'

const ANALYSE_WITH_FN: undefined | FN_MATCHING_METHODS_TYPE = undefined
const APPS_TO_ANALYSE_LIMIT = 1000
const ALL_APPS_PATH = '../data/sample_apps'
const FIN_PRE_APPS_PATH = join(ALL_APPS_PATH, FINISHED_PREPROCESSING_FILE)
const FIN_AN_APPS_PATH = join(ALL_APPS_PATH, FINISHED_ANALYSIS_FILE)
const ALL_LIBS_PATH = '../data/sample_libs'

let terminating = false

export const main: MainFn = async function main(log) {
  const apps = (await readJSON(FIN_PRE_APPS_PATH)) as appDesc[]
  let FIN_AN_APPS = [] as appDesc[]

  if (terminating) {
    return
  }

  if (await pathExists(FIN_AN_APPS_PATH)) {
    FIN_AN_APPS = await readJSON(FIN_AN_APPS_PATH)
    log.info('loaded FIN_AN_APPS')
  }

  const filtered = differenceWith(isEqual, apps, FIN_AN_APPS)
  const subset = take(APPS_TO_ANALYSE_LIMIT, shuffle(filtered))
  log.info(
    'apps: (all=%o)-(fin_an=%o)=(todo=%o/%o)',
    apps.length,
    FIN_AN_APPS.length,
    subset.length,
    filtered.length,
  )

  const pool = poolFactory<allMessages>(join(__dirname, WORKER_FILENAME), { minWorkers: 0 })
  log.info({ stats: pool.stats() }, 'pool: min=%o, max=%o', pool.minWorkers, pool.maxWorkers)

  const appsPromises = subset.map((app) => async () => {
    if (terminating) {
      return { done: false, ...app }
    }

    if (app.type === APP_TYPES.reactNative) {
      return { done: false, ...app }
    } else if (app.type === APP_TYPES.cordova) {
      try {
        await analyseCordovaApp({
          allAppsPath: ALL_APPS_PATH,
          libsPath: ALL_LIBS_PATH,
          app,
          pool,
          fn: ANALYSE_WITH_FN,
        })
        return { done: true, ...app }
      } catch (err) {
        log.error({ err, app }, 'analyseCordovaApp() threw an error')
        return { done: false, ...app }
      }
    } else {
      return assertNever(app.type)
    }
  })

  log.info('started analysis')
  const results = await resolveAllOrInParallel(appsPromises, {
    chunkLimit: pool.maxWorkers + 1,
    chunkSize: Math.floor(1.5 * pool.maxWorkers),
    chunkTapFn: async (apps) => {
      const finished = apps
        .filter(({ done }) => done)
        .map(({ type, section, app }) => ({ type, section, app }))

      if (finished.length > 0) {
        FIN_AN_APPS = FIN_AN_APPS.concat(finished)
        FIN_AN_APPS.sort((a, b) => {
          return `${a.type}/${a.section}/${a.app}`.localeCompare(`${b.type}/${b.section}/${b.app}`)
        })
        await myWriteJSON({ content: FIN_AN_APPS, file: FIN_AN_APPS_PATH })
      }
    },
  })
  if (terminating) {
    log.info('terminated analysis')
  } else {
    log.info('finished analysis')
  }

  const [done, notDone] = partition(({ done }) => done, results)
  const doneLength = done.length
  const notDoneLength = notDone.length

  log.info(
    'apps: (done=%o)+(not-done=%o)=(total=%o)',
    doneLength,
    notDoneLength,
    doneLength + notDoneLength,
  )

  FIN_AN_APPS.sort((a, b) => {
    return `${a.type}/${a.section}/${a.app}`.localeCompare(`${b.type}/${b.section}/${b.app}`)
  })
  await myWriteJSON({ content: FIN_AN_APPS, file: FIN_AN_APPS_PATH })
  log.info('updated FIN_AN_APPS')

  await pool.terminate()
}

export const terminate: TerminateFn = (log) =>
  once(() => {
    log.info('started terminating')
    terminating = true
  })
