import { once } from 'lodash'
import { join } from 'path'
import { APP_TYPES, getApps } from '../parseApps'
import { resolveAllOrInParallel } from '../utils'
import logger from '../utils/logger'
import { poolFactory } from '../utils/worker'
import { messages } from './extract-apps'

const FINISHED_APK = '../data/apps_apks'
const EXTRACTED_JS = '../data/sample_apps.again'
const TMP_FOLDER = '../data/tmp'

const log = logger.child({ name: 'reextract-apps' })

let terminating = false

export async function main() {
  const wPath = join(__dirname, 'extract-apps.worker.js')
  const pool = poolFactory<messages>(wPath)

  const appsPromises = (await getApps(FINISHED_APK)).map((app) => async () => {
    if (terminating) {
      return app
    }

    await pool.exec('reextractApp', [{ inputPath: FINISHED_APK, outputPath: TMP_FOLDER, app }])
    const type = await pool.exec('moveDecompApp', [
      {
        inputPath: join(TMP_FOLDER, app.type),
        outputPath: EXTRACTED_JS,
        section: app.section,
        app: app.app,
      },
    ])
    if ((type as any) !== (app.type as any)) {
      log.warn({ app, type }, 'something went wrong when reextracting app')
    }

    return app
  })

  const apps = await resolveAllOrInParallel(appsPromises)
  const cordovaApps = apps.filter(({ type }) => type === APP_TYPES.cordova)
  const reactNativeApps = apps.filter(({ type }) => type === APP_TYPES.reactNative)
  const cordovaAppsLen = cordovaApps.length
  const reactNativeAppsLen = reactNativeApps.length

  log.info(
    `fin %o (cr=%o)+(rn=%o)=(total=%o)`,
    apps.length,
    cordovaAppsLen,
    reactNativeAppsLen,
    cordovaAppsLen + reactNativeAppsLen,
  )

  await pool.terminate()
}

export const terminate = once(() => {
  log.info('started terminating')
  terminating = true
})
