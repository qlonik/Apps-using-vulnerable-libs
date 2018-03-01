import { pathExists, readdir } from 'fs-extra'
import { join } from 'path'
import { APP_TYPES, getApps } from '../parseApps'
import { getLibNameVersions } from '../parseLibraries'
import { stdoutLog } from '../utils/logger'

const LIB_FOLDER = '../data/sample_libs'
const APP_FOLDER = '../data/sample_apps'
const APP_POOL_FOLDER = '/gi-pool/appdata-ro'

const log = stdoutLog('data-status')
log.enabled = true

async function main() {
  if (await pathExists(LIB_FOLDER)) {
    const libs = await getLibNameVersions(LIB_FOLDER)

    log('total libs+vers:     %o', libs.length)
  }

  if (await pathExists(APP_FOLDER)) {
    const cordovaApps = await getApps(APP_FOLDER, APP_TYPES.cordova)
    const rnApps = await getApps(APP_FOLDER, APP_TYPES.reactNative)

    log('total cordova:       %o', cordovaApps.length)
    log('total react-native:  %o', rnApps.length)
  }

  if (await pathExists(APP_FOLDER)) {
    const sections = await readdir(APP_POOL_FOLDER)
    const apps = await sections.reduce(async (acc, section) => {
      const prev = await acc
      const sectionApps = await readdir(join(APP_POOL_FOLDER, section))
      return prev.concat(sectionApps.map((app) => ({ section, app })))
    }, Promise.resolve([] as { section: string; app: string }[]))

    log('total apps in pool:  %o', apps.length)
  }
}

main().catch((err) => log('Some global error:\n%s', err.stack))
