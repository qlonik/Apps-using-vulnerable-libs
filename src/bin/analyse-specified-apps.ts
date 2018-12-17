import { once } from 'lodash/fp'
import { join } from 'path'
import { analyseCordovaApp, APP_TYPES, appDesc } from '../parseApps'
import { resolveAllOrInParallel } from '../utils'
import { poolFactory } from '../utils/worker'
import { allMessages, MainFn, TerminateFn, WORKER_FILENAME } from './_all.types'

const FULL_APP_ANALYSIS: appDesc<APP_TYPES.cordova>[] = [
  // {
  //   type: APP_TYPES.cordova,
  //   section: '20170726-a_b',
  //   app: 'apps.yclients88759-10300-2017_04_13.apk',
  // },
  // {
  //   type: APP_TYPES.cordova,
  //   section: '20170726-a_b',
  //   app: 'br.com.williarts.radiovox-20008-2017_01_25.apk',
  // },
  // {
  //   type: APP_TYPES.cordova,
  //   section: '20170726-com.t',
  //   app: 'com.tiny.m91392d54e89b48a6b2ecf1306f88ebbb-300000016-2017_02_17.apk',
  // },
  {
    type: APP_TYPES.cordova,
    section: 'random',
    app: 'Snowbuddy-1.2.8.apk',
  },
]

export const environment = {
  APPS_PATH: {},
  LIBS_PATH: {},
}

let terminating = false
export const main: MainFn<typeof environment> = async function main(
  log,
  { APPS_PATH: allAppsPath, LIBS_PATH: libsPath },
) {
  const pool = poolFactory<allMessages>(join(__dirname, WORKER_FILENAME), {
    minWorkers: 0,
    // maxWorkers: 2,
  })

  log.info('started analysis')
  const done = await resolveAllOrInParallel(
    FULL_APP_ANALYSIS.map((app) => async (): Promise<{ done: boolean; app: appDesc }> => {
      if (terminating) {
        return { done: false, app }
      }

      try {
        await analyseCordovaApp({ allAppsPath, libsPath, app, pool })
        return { done: true, app }
      } catch (err) {
        log.error({ err, app }, 'analyseCordovaApp() threw an error')
        return { done: false, app }
      }
    }),
  )
  log.info('finished analysis')
  log.info({ done }, 'analysis results')

  await pool.terminate()
}

export const terminate: TerminateFn = (log) =>
  once(() => {
    log.info('started terminating')
    terminating = true
  })
