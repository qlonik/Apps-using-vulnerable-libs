import { pathExists, readJSON } from 'fs-extra'
import { differenceWith, isEqual, partition, once } from 'lodash'
import shuffle from 'lodash/fp/shuffle'
import { join } from 'path'
import { Pool } from 'workerpool'
import { appDesc, getApps } from '../parseApps'
import { FINISHED_PREPROCESSING_FILE } from '../parseApps/constants'
import { myWriteJSON } from '../utils/files'
import { poolFactory } from '../utils/worker'
import { WORKER_FILENAME, allMessages, MainFn, TerminateFn } from './_all.types'

// const APP_PATH = '/home/nvolodin/Auvl/data/done/js'
const APP_PATH = '../data/sample_apps'
const FIN_APPS_PATH = join(APP_PATH, FINISHED_PREPROCESSING_FILE)
const LIB_PATH = '../data/sample_libs'

let pool: Pool<allMessages>
let terminating = false

export const main: MainFn = async function main(log) {
  const wPath = join(__dirname, WORKER_FILENAME)
  const apps = await getApps(APP_PATH)
  let FIN_APPS = [] as appDesc[]

  if (terminating) {
    return
  }

  if (await pathExists(FIN_APPS_PATH)) {
    FIN_APPS = await readJSON(FIN_APPS_PATH)
    log.info('loaded FIN_APPS')
  }

  const filtered = differenceWith(apps, FIN_APPS, isEqual)
  const todo = shuffle(filtered)
  log.info(
    'apps: (all=%o)-(fin=%o)=(todo=%o/%o)',
    apps.length,
    FIN_APPS.length,
    todo.length,
    filtered.length,
  )

  pool = poolFactory(wPath, { minWorkers: 0 })
  log.info({ stats: pool.stats() }, 'pool: min=%o, max=%o', pool.minWorkers, pool.maxWorkers)

  // analyse chosen apps promises
  const appsPromises = todo.map(async (app) => {
    if (terminating) {
      return { done: false, ...app }
    }
    const done = await pool.exec('preprocess-app', [
      { app, allAppsPath: APP_PATH, allLibsPath: LIB_PATH },
    ])
    return { done, ...app }
  })

  log.info('started preprocessing')
  const results = await Promise.all(appsPromises)
  if (terminating) {
    log.info('terminated preprocessing')
  } else {
    log.info('finished preprocessing')
  }

  const [done, notDone] = partition(results, ({ done }) => done).map((apps) =>
    apps.map(({ type, section, app }) => ({ type, section, app })),
  )
  const doneLength = done.length
  const notDoneLength = notDone.length

  log.info(
    'apps: (done=%o)+(not-done=%o)=(total=%o/%o)',
    doneLength,
    notDoneLength,
    doneLength + notDoneLength,
    filtered.length,
  )

  await myWriteJSON({ content: FIN_APPS.concat(done), file: FIN_APPS_PATH })
  log.info('updated FIN_APPS')

  await pool.terminate()
}

export const terminate: TerminateFn = (log) =>
  once(() => {
    log.info('started terminating')
    terminating = true
  })
