import { join } from 'path'
import {
  parseScriptsFromCordovaApp,
  parseScriptsFromCordovaApps,
  parseScriptsFromReactNativeApp,
  parseScriptsFromReactNativeApps,
} from './parseApps'


const LIB_PATH = '../data/sample_libs'

const ALL_APPS_PATH = '../data/sample_apps/everything'
const CORDOVA_APPS_PATH = '../data/sample_apps/cordova'
const REACT_NATIVE_APPS_PATH = '../data/sample_apps/react-native'

const parseScriptsFromSnowbuddy = () => parseScriptsFromCordovaApp({
  appPath: join(ALL_APPS_PATH, '../random/Snowbuddy-1.2.8'),
  libsPath: LIB_PATH,
}, { debugDoLess: true })

const parseScriptsFromAllCordovaApps = () => parseScriptsFromCordovaApps({
  allAppsPath: CORDOVA_APPS_PATH,
  libsPath: LIB_PATH,
})

const parseScriptsFromLocaleur = () => parseScriptsFromReactNativeApp({
  appPath: join(ALL_APPS_PATH, '../random/Localeur-3.1'),
  libsPath: LIB_PATH,
})

const parseScriptsFromAllReactNativeApps = () => parseScriptsFromReactNativeApps({
  allAppsPath: REACT_NATIVE_APPS_PATH,
  libsPath: LIB_PATH,
})

async function main() {
  return await parseScriptsFromSnowbuddy()
}

main()
// demo()
  .then(() => console.log('Everything is done!'))
  .catch((err) => console.log(`Some global error:\n${err}\n${err.stack}`))

