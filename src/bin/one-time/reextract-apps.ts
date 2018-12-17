import { once } from 'lodash'
import { join } from 'path'
import { APP_TYPES, getApps } from '../../parseApps'
import { resolveAllOrInParallel } from '../../utils'
import { poolFactory } from '../../utils/worker'
import { allMessages, MainFn, TerminateFn, WORKER_FILENAME } from '../_all.types'

let terminating = false

export const environment = {
  /**
   * Location of selected apks
   *
   * @example ```js
   *   './data/apps-all/apks'
   *   './data/apps-small-set/apks'
   * ```
   */
  APKS: {},
  /**
   * Location of extracted files
   *
   * @example ```js
   *   './data/apps-all/extracted'
   *   './data/apps-all/extracted.again'
   *   './data/apps-small-set/extracted'
   * ```
   */
  EXTRACTED: {},
  /**
   * Location of tmp folder
   *
   * @example ```js
   *   './data/apps-all/tmp'
   * ```
   */
  TMP_DIR: {},
}

export const main: MainFn<typeof environment> = async function main(
  log,
  { APKS: FINISHED_APK, EXTRACTED: EXTRACTED_JS, TMP_DIR: TMP_FOLDER },
) {
  const pool = poolFactory<allMessages>(join(__dirname, WORKER_FILENAME))

  const appsPromises = (await getApps(FINISHED_APK)).map((app) => async () => {
    if (terminating) {
      return app
    }

    await pool.exec('re-extract-app', [{ inputPath: FINISHED_APK, outputPath: TMP_FOLDER, app }])
    const type = await pool.exec('move-decomp-app', [
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

export const terminate: TerminateFn = (log) =>
  once(() => {
    log.info('started terminating')
    terminating = true
  })
