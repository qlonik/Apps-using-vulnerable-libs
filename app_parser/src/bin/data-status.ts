import { APP_TYPES, getApps } from '../parseApps'
import { getLibNameVersions } from '../parseLibraries'
import { stdoutLog } from '../utils/logger'

const LIB_FOLDER = '../data/sample_libs'
const APP_FOLDER = '../data/sample_apps'

const log = stdoutLog('data-status')
log.enabled = true

async function main() {
  const libs = await getLibNameVersions(LIB_FOLDER)
  const cordovaApps = await getApps(APP_FOLDER, APP_TYPES.cordova)
  const rnApps = await getApps(APP_FOLDER, APP_TYPES.reactNative)

  log('total libs+vers:     %o', libs.length)
  log('total cordova:       %o', cordovaApps.length)
  log('total react-native:  %o', rnApps.length)
}

main().catch((err) => log('Some global error:\n%s', err.stack))
