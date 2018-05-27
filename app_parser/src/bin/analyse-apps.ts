import { pathExists, readJSON } from 'fs-extra'
import { differenceWith, isEqual, once, partition, take } from 'lodash'
import { join } from 'path'
import { appDesc } from '../parseApps'
import { FINISHED_ANALYSIS_FILE, FINISHED_PREPROCESSING_FILE } from '../parseApps/constants'
import { resolveAllOrInParallel } from '../utils'
import { myWriteJSON } from '../utils/files'
import { stdoutLog } from '../utils/logger'
import { poolFactory } from '../utils/worker'
import { allMessages, WORKER_FILENAME } from './_all.types'

const APPS_TO_ANALYSE_LIMIT = 1000
const ALL_APPS_PATH = '../data/sample_apps'
const FIN_PRE_APPS_PATH = join(ALL_APPS_PATH, FINISHED_PREPROCESSING_FILE)
const FIN_AN_APPS_PATH = join(ALL_APPS_PATH, FINISHED_ANALYSIS_FILE)
const ALL_LIBS_PATH = '../data/sample_libs'

const log = stdoutLog('analyse-apps')
log.enabled = true
let terminating = false

export async function main() {
  const apps = (await readJSON(FIN_PRE_APPS_PATH)) as appDesc[]
  let FIN_AN_APPS = [] as appDesc[]

  if (terminating) {
    return
  }

  if (await pathExists(FIN_AN_APPS_PATH)) {
    FIN_AN_APPS = await readJSON(FIN_AN_APPS_PATH)
    log('loaded FIN_AN_APPS')
  }

  const filtered = differenceWith(apps, FIN_AN_APPS, isEqual)
  const subset = take(filtered, APPS_TO_ANALYSE_LIMIT)
  log(
    'apps: (all=%o)-(fin_an=%o)=(todo=%o/%o)',
    apps.length,
    FIN_AN_APPS.length,
    subset.length,
    filtered.length,
  )

  const pool = poolFactory<allMessages>(join(__dirname, WORKER_FILENAME), { minWorkers: 0 })
  log('pool: min=%o, max=%o, %o', pool.minWorkers, pool.maxWorkers, pool.stats())

  const appsPromises = subset.map((app) => async () => {
    if (terminating) {
      return { done: false, ...app }
    }
    const done = await pool.exec('analyse-app', [
      { app, allAppsPath: ALL_APPS_PATH, allLibsPath: ALL_LIBS_PATH },
    ])
    return { done, ...app }
  })

  log('started analysis')
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
    log('terminated analysis')
  } else {
    log('finished analysis')
  }

  const [done, notDone] = partition(results, ({ done }) => done)
  const doneLength = done.length
  const notDoneLength = notDone.length

  log(
    'apps: (done=%o)+(not-done=%o)=(total=%o)',
    doneLength,
    notDoneLength,
    doneLength + notDoneLength,
  )

  FIN_AN_APPS.sort((a, b) => {
    return `${a.type}/${a.section}/${a.app}`.localeCompare(`${b.type}/${b.section}/${b.app}`)
  })
  await myWriteJSON({ content: FIN_AN_APPS, file: FIN_AN_APPS_PATH })
  log('updated FIN_AN_APPS')

  await pool.terminate()
}

export const terminate = once(() => {
  log('started terminating')
  terminating = true
})
