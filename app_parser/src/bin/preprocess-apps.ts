import { pathExists, readJSON } from 'fs-extra'
import { differenceWith, isEqual, partition, once } from 'lodash'
import { join } from 'path'
import { The } from 'typical-mini'
import { MessagesMap, Pool, pool as poolFactory } from 'workerpool'
import { appDesc, getApps } from '../parseApps'
import { resolveAllOrInParallel } from '../utils'
import { myWriteJSON } from '../utils/files'
import { stdoutLog } from '../utils/logger'
import { getWorkerPath } from '../utils/worker'

const log = stdoutLog('preprocess-apps')
log.enabled = true

export type messages = The<
  MessagesMap,
  {
    preprocess: [[{ allAppsPath: string; app: appDesc }], boolean]
  }
>

// const APP_PATH = '/home/nvolodin/Auvl/data/done/js'
const APP_PATH = '../data/sample_apps'
const FIN_APPS_PATH = join(APP_PATH, '_fin_pre_prerocess.json')

let pool: Pool<messages>
let terminating = false

async function main() {
  const wPath = await getWorkerPath(__filename)
  const apps = await getApps(APP_PATH)
  let FIN_APPS = [] as appDesc[]

  if (terminating) {
    return
  }

  if (await pathExists(FIN_APPS_PATH)) {
    FIN_APPS = await readJSON(FIN_APPS_PATH)
    log('loaded  FIN_APPS')
  }

  const filtered = differenceWith(apps, FIN_APPS, isEqual)
  log('apps: (all=%o)-(fin=%o)=(todo=%o)', apps.length, FIN_APPS.length, filtered.length)

  pool = poolFactory(wPath, { minWorkers: 0 })
  log('pool: min=%o, max=%o, %o', pool.minWorkers, pool.maxWorkers, pool.stats())

  // analyse all apps promises
  const appsPromises = filtered.map((app) => async () => {
    if (terminating) {
      return { done: false, ...app }
    }
    const done: messages['preprocess'][1] = await pool.exec('preprocess', [
      { allAppsPath: APP_PATH, app },
    ])
    return { done, ...app }
  })

  log('started preprocessing')
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
    log('terminated preprocessing')
  } else {
    log('finished preprocessing')
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

  await myWriteJSON({ content: FIN_APPS, file: FIN_APPS_PATH })
  log('updated FIN_APPS')

  await pool.terminate()
}

if (require.main === module) {
  process.on(
    'SIGINT',
    once(() => {
      log('started terminating')
      terminating = true
    }),
  )

  main().catch((err) => log('Some global error:\n%s', err.stack))
}
