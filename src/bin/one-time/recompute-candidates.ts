import { The } from 'typical-mini'
import { MessagesMap } from 'workerpool'
import { APP_TYPES, appDesc, getApps } from '../../parseApps'
import { stdoutLog } from '../../utils/logger'
import { getWorkerPath, poolFactory } from '../../utils/worker'
import { MainFn } from '../_all.types'

const log = stdoutLog('recompute-candidates')

export type messages = The<
  MessagesMap,
  {
    'recompute-candidates': [[{ app: appDesc; appsPath: string; libsPath: string }], boolean | null]
  }
>

export const environment = {
  APPS_PATH: {},
  LIBS_PATH: {},
}

export const main: MainFn<typeof environment> = async function main(_, { APPS_PATH, LIBS_PATH }) {
  const wPath = await getWorkerPath(__filename)
  const rnApps = await getApps(APPS_PATH, APP_TYPES.reactNative)

  const pool = poolFactory<messages>(wPath, { minWorkers: 0 })

  const results = await Promise.all(
    rnApps.map((app) => {
      return pool.exec('recompute-candidates', [{ app, appsPath: APPS_PATH, libsPath: LIBS_PATH }])
    }),
  )

  log('results: %O', results)
}
