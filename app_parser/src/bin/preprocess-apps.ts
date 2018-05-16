import { pathExists, readJSON } from 'fs-extra'
import { differenceWith, isEqual, partition, once } from 'lodash'
import { join } from 'path'
import { The } from 'typical-mini'
import { MessagesMap, Pool } from 'workerpool'
import { appDesc, getApps } from '../parseApps'
import { FINISHED_PREPROCESSING_FILE } from '../parseApps/constants'
import { resolveAllOrInParallel } from '../utils'
import { myWriteJSON } from '../utils/files'
import { log } from '../utils/logger'
import { getWorkerPath, poolFactory } from '../utils/worker'

export type messages = The<
  MessagesMap,
  {
    preprocess: [[{ allAppsPath: string; allLibsPath: string; app: appDesc }], boolean]
  }
>

// const APP_PATH = '/home/nvolodin/Auvl/data/done/js'
const APP_PATH = '../data/sample_apps'
const FIN_APPS_PATH = join(APP_PATH, FINISHED_PREPROCESSING_FILE)
const LIB_PATH = '../data/sample_libs'

let pool: Pool<messages>
let terminating = false

export async function main() {
  const wPath = await getWorkerPath(__filename)
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
  log.info('apps: (all=%o)-(fin=%o)=(todo=%o)', apps.length, FIN_APPS.length, filtered.length)

  pool = poolFactory(wPath, { minWorkers: 0 })
  log.info({ stats: pool.stats() }, 'pool: min=%o, max=%o', pool.minWorkers, pool.maxWorkers)

  // analyse all apps promises
  const appsPromises = filtered.map((app) => async () => {
    if (terminating) {
      return { done: false, ...app }
    }
    const done = await pool.exec('preprocess', [
      { app, allAppsPath: APP_PATH, allLibsPath: LIB_PATH },
    ])
    return { done, ...app }
  })

  log.info('started preprocessing')
  const results = await resolveAllOrInParallel(appsPromises, {
    chunkLimit: pool.maxWorkers + 1,
    chunkSize: Math.floor(1.5 * pool.maxWorkers),
    chunkTapFn: async (apps) => {
      const finished = apps
        .filter(({ done }) => done)
        .map(({ type, section, app }) => ({ type, section, app }))

      if (finished.length > 0) {
        FIN_APPS = FIN_APPS.concat(finished)
      }
    },
  })
  if (terminating) {
    log.info('terminated preprocessing')
  } else {
    log.info('finished preprocessing')
  }

  const [done, notDone] = partition(results, ({ done }) => done)
  const doneLength = done.length
  const notDoneLength = notDone.length

  log.info(
    'apps: (done=%o)+(not-done=%o)=(total=%o)',
    doneLength,
    notDoneLength,
    doneLength + notDoneLength,
  )

  await myWriteJSON({ content: FIN_APPS, file: FIN_APPS_PATH })
  log.info('updated FIN_APPS')

  await pool.terminate()
}

export const terminate = once(() => {
  log.info('started terminating')
  terminating = true
})
