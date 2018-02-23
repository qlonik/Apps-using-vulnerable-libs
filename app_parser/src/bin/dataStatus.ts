import { APP_TYPES, getApps } from '../parseApps'
import { getLibNameVersions } from '../parseLibraries'


const LIB_FOLDER = '../data/sample_libs'
const APP_FOLDER = '../data/sample_apps'


async function main() {
  const libs = await getLibNameVersions(LIB_FOLDER)
  const cordovaApps = await getApps(APP_FOLDER, APP_TYPES.cordova)
  const rnApps = await getApps(APP_FOLDER, APP_TYPES.reactNative)

  console.log(`total libs+vers:  ${libs.length}`)
  console.log(`total apps (cd):  ${cordovaApps.length}`)
  console.log(`total apps (rn):  ${rnApps.length}`)
}

main()
  .catch((err) => console.log('Some global error:\n' + err.stack))


