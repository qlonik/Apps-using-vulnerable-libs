import { readdir, remove } from 'fs-extra'
import { join } from 'path'
import { Pool } from 'workerpool'
import { APP_TYPES } from '../parseApps'
import { resolveAllOrInParallel } from '../utils'
import { stdoutLog } from '../utils/logger'
import { poolFactory } from '../utils/worker'
import { allMessages, WORKER_FILENAME } from './_all.types'

// can be '/gi-pool/appdata-ro' or '/home/nvolodin/20180315/crawl-fdroid/crawl-fdroid/apks'
const INPUT_FOLDER = ''
const TMP_FOLDER = '/home/nvolodin/Auvl/data/tmp'
const EXTRACTED_JS = '/home/nvolodin/Auvl/data/sample_apps'
const FINISHED_APK = '/home/nvolodin/Auvl/data/apps_apks'

const sections_fin = [
  // done using this script
  '20170726-a_b',
  '20170726-c_com.ah',
  '20170726-com.ai_com.ao',
  '20170726-com.ap',
  '20170726-com.aq_com.az',
  '20170726-com.b',
  '20170726-com.c',
  '20170726-com.d',
  '20170726-com.e',
  '20170726-com.f',
  '20170726-com.g',
  '20170726-com.h',
  '20170726-com.i',
  '20170726-com.j',
  '20170726-com.k',
  '20170726-com.l',
  '20170726-com.m',
  '20170726-com.n',
  '20170726-com.o',
  '20170726-com.s',
  '20170726-d-z',

  // were done using old script
  '20170726-com0',
  '20170726-com.p',
  '20170726-com.q',
  '20170726-com.r',
  '20170726-com.t',
  '20170726-com.u',
  '20170726-com.w',
  '20170726-com.x',
]

const log = stdoutLog('extract-apps')
log.enabled = true

let terminating: Promise<void>
let pool: Pool<allMessages>

export async function main() {
  if (!INPUT_FOLDER) {
    log('INPUT_FOLDER is not specified')
    return
  }

  const sections_todo = await readdir(INPUT_FOLDER)

  if (!terminating) {
    pool = poolFactory(join(__dirname, WORKER_FILENAME), { minWorkers: 1 })
    log('started worker')
  }

  for (let section of sections_todo) {
    if (terminating) {
      break
    }

    if (sections_fin.includes(section)) {
      log('skp %o (already finished)', section)
      continue
    }

    const appNames = await readdir(join(INPUT_FOLDER, section))
    const appsPromises = appNames.map((app) => {
      return async () => {
        await pool.exec('extract-app', [
          { inputPath: INPUT_FOLDER, outputPath: TMP_FOLDER, section, app },
        ])
        const type = await pool.exec('move-decomp-app', [
          { inputPath: TMP_FOLDER, outputPath: EXTRACTED_JS, section, app },
        ])

        if (type !== 'removed') {
          await pool.exec('copy-apk', [
            { inputPath: INPUT_FOLDER, outputPath: FINISHED_APK, type, section, app },
          ])
        }

        return { section, app, type }
      }
    })

    const apps = await resolveAllOrInParallel(appsPromises)
    const cordovaApps = apps.filter(({ type }) => type === APP_TYPES.cordova)
    const reactNativeApps = apps.filter(({ type }) => type === APP_TYPES.reactNative)
    const cordovaAppsLen = cordovaApps.length
    const reactNativeAppsLen = reactNativeApps.length

    log(
      `fin %o (cr=%o)+(rn=%o)=(total=%o)`,
      section,
      cordovaAppsLen,
      reactNativeAppsLen,
      cordovaAppsLen + reactNativeAppsLen,
    )

    const sectionTmpDir = join(TMP_FOLDER, section)
    const tmpDirContents = await readdir(sectionTmpDir)
    if (tmpDirContents.length === 0) {
      await remove(sectionTmpDir)
    }
  }

  const tmpDirContents = await readdir(TMP_FOLDER)
  if (tmpDirContents.length === 0) {
    await remove(TMP_FOLDER)
  }

  await pool.terminate()
}

export const terminate = () => {
  if (pool) {
    terminating = pool.terminate()
  } else {
    terminating = Promise.resolve()
  }
}
