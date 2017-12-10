import { moveDefinitelyCordovaApps, moveDefinitelyReactNativeApps } from './parseApps'


const ALL_APPS_PATH = '../data/sample_apps/everything'
const CORDOVA_APPS_PATH = '../data/sample_apps/cordova'
const REACT_NATIVE_APPS_PATH = '../data/sample_apps/react-native'

async function main() {
  await moveDefinitelyCordovaApps({
    allAppsPath: ALL_APPS_PATH,
    appTypePath: CORDOVA_APPS_PATH,
  })
  await moveDefinitelyReactNativeApps({
    allAppsPath: ALL_APPS_PATH,
    appTypePath: REACT_NATIVE_APPS_PATH,
  })
}

main()
  .then(() => console.log('Everything is done!'))
  .catch((err) => console.log(`Some global error:\n${err}\n${err.stack}`))
