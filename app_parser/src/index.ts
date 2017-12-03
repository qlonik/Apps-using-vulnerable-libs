import { join } from 'path'
import { parseScriptsFromCordovaApp, parseScriptsFromCordovaApps, } from './parseApps'


const LIB_PATH = '../data/sample_libs'
const DUMP_PATH = '../data/lib_dump'

const ALL_APPS_PATH = '../data/sample_apps/everything'
const CORDOVA_APPS_PATH = '../data/sample_apps/cordova'
const REACT_NATIVE_APPS_PATH = '../data/sample_apps/react-native'

const parseScriptsFromSnowbuddy = () => parseScriptsFromCordovaApp({
  appPath: join(ALL_APPS_PATH, '../random/Snowbuddy-1.2.8'),
  libsPath: LIB_PATH,
}, { doJustOne: true })

async function main() {
  // return await parseScriptsFromSnowbuddy()
  // return await appsReformat({ allAppsPath: ALL_APPS_PATH, })
  // return await moveDefinitelyCordovaApps({
  //   allAppsPath: ALL_APPS_PATH,
  //   appTypePath: CORDOVA_APPS_PATH,
  // })
  return await parseScriptsFromCordovaApps({
    allAppsPath: CORDOVA_APPS_PATH,
    libsPath: LIB_PATH,
  })
}

main()
// demo()
  .then(() => {
    console.log('Everything is done!')
  })
  .catch((err) => {
    console.log(`Some global error:\n${err}`)
  })

