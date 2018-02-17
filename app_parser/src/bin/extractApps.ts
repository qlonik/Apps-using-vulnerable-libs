import { pathExists, readdir, remove } from 'fs-extra'
import { basename, extname, join } from 'path'
import { The } from 'typical-mini'
import { MessagesMap, Pool, pool as poolFactory } from 'workerpool'
import { AppDescription } from '../parseApps'
import { resolveAllOrInParallel } from '../utils'
import { stdoutLog } from '../utils/logger'


export type messages = The<MessagesMap, {
  extractApp: [
    [{ inputPath: string, outputPath: string } & AppDescription],
    boolean],
  moveDecompApp: [
    [{ inputPath: string, outputPath: string } & AppDescription],
    APP_TYPE],
  copyApk: [
    [{ inputPath: string, outputPath: string, type: APP_TYPE } & AppDescription],
    boolean],
}>

export enum APP_TYPE {
  removed = 'removed',
  cordova = 'cordova',
  reactNative = 'react-native',
}


const INPUT_FOLDER = '/gi-pool/appdata-ro'
const TMP_FOLDER = '/home/nvolodin/Auvl/data/tmp'
const EXTRACTED_JS = '/home/nvolodin/Auvl/data/done/js'
const FINISHED_APK = '/home/nvolodin/Auvl/data/done/apks'

const sections_fin = [
  '20170726-com0',
  '20170726-com.p',
  '20170726-com.q',
  '20170726-com.r',
  '20170726-com.t',
  '20170726-com.u',
  '20170726-com.w',
  '20170726-com.x',
  '20170726-d-z',
]

const log = stdoutLog('extract-apps')

let terminating: Promise<void>
let pool: Pool<messages>

async function main() {
  const ext = extname(__filename)
  const name = basename(__filename, ext)
  const wPath = join(__dirname, `${name}.worker${ext}`)
  const wExists = await pathExists(wPath)

  const sections_todo = await readdir(INPUT_FOLDER)

  if (!wExists) {
    throw new Error('no worker present')
  }

  if (!terminating) {
    pool = poolFactory(wPath, { minWorkers: 1 })
    log('started worker')
  }

  for (let section of sections_todo) {
    if (terminating) {
      break
    }

    if (sections_fin.includes(section)) {
      continue
    }

    const appNames = await readdir(join(INPUT_FOLDER, section))
    const appsPromises = appNames.map((app) => {
      return async () => {
        await pool.exec('extractApp', [
          { inputPath: INPUT_FOLDER, outputPath: TMP_FOLDER, section, app }
        ])
        const type = await pool.exec('moveDecompApp', [
          { inputPath: TMP_FOLDER, outputPath: EXTRACTED_JS, section, app }
        ])

        if (type !== APP_TYPE.removed) {
          await pool.exec('copyApk', [
            { inputPath: INPUT_FOLDER, outputPath: FINISHED_APK, type, section, app }
          ])
        }

        return { section, app, type }
      }
    })

    const apps = await resolveAllOrInParallel(appsPromises)
    const cordovaApps = apps.filter(({ type }) => type === APP_TYPE.cordova)
    const reactNativeApps = apps.filter(({ type }) => type === APP_TYPE.reactNative)
    const cordovaAppsLen = cordovaApps.length
    const reactNativeAppsLen = reactNativeApps.length

    log(`fin %o (cr=%o)+(rn=%o)=(total=%o)`,
      section, cordovaAppsLen, reactNativeAppsLen, cordovaAppsLen + reactNativeAppsLen)

    const sectionTmpDir = join(TMP_FOLDER, section)
    const tmpDirContents = await readdir(sectionTmpDir)
    if (!tmpDirContents.length) {
      await remove(sectionTmpDir)
    }
  }

  await pool.terminate()
}

if (require.main === module) {
  process.on('SIGINT', () => {
    if (pool) {
      terminating = pool.terminate()
    }
    else {
      terminating = Promise.resolve()
    }
  })

  main()
    .then(() => log('Everything is done!'))
    .catch((err) => log(`Some global error: ${err.stack}`))
}
