import { copy, ensureDir, move, readdir } from 'fs-extra'
import { join } from 'path';

import { appDesc, isCordovaApp, parseScriptsFromCordovaApp } from './parseApps'
import { chunk, resolveParallelGroups } from './utils'


const LIB_PATH = '../data/sample_libs'
const DUMP_PATH = '../data/lib_dump'

const ALL_APPS_PATH = '../data/sample_apps/everything'
const CORDOVA_APPS_PATH = '../data/sample_apps/cordova'

// import { getSimilaritiesFromPath } from './similarityIndex'
// const UNKNOWN_FN_SIGNATURE = '../data/sample_apps/random/Snowbuddy-1.2.8/jsAnalysis/head/0000'
// const similarityIndexCaller =
//   () => getSimilaritiesFromPath({ unknownLibPath: UNKNOWN_FN_SIGNATURE, libsPath: LIB_PATH })


const parseScriptsFromSnowbuddy = () => parseScriptsFromCordovaApp({
  DEBUG_DO_JUST_ONE: true,
  appPath: join(ALL_APPS_PATH, '../random/Snowbuddy-1.2.8'),
  libsPath: LIB_PATH,
})

const parseScriptsFromCordovaApps = async (
  { DEBUG_DO_JUST_ONE = false }: { DEBUG_DO_JUST_ONE?: boolean } = {}) => {

  const apps = await getAppsAndSections({ allAppsPath: CORDOVA_APPS_PATH })
  const lazyAppAnalysis = apps.map((app) => {
    return async () => {
      return parseScriptsFromCordovaApp({
        appPath: join(CORDOVA_APPS_PATH, app.section, app.app),
        libsPath: LIB_PATH,
      })
    }
  })
  if (DEBUG_DO_JUST_ONE) {
    await lazyAppAnalysis[0]()
    await lazyAppAnalysis[1]()
  }
  else {
    await resolveParallelGroups(chunk(lazyAppAnalysis, 10))
  }
}

const appsReformat = async function () {
  const appsPath = join(ALL_APPS_PATH, '20170726-com0')
  const apps = await readdir(appsPath)
  const pr = apps.map((app) => async () => {
    const appPath = join(appsPath, app)
    const dest = join(appPath, 'apktool.decomp')
    await ensureDir(dest)
    const files = (await readdir(appPath)).filter((file) => file !== 'apktool.decomp')
    await Promise.all(files.map(async (file) => {
      await move(join(appPath, file), join(dest, file))
    }))
  })
  await resolveParallelGroups(chunk(pr, 10))
}


const getAppsAndSections = async (
  { allAppsPath }: { allAppsPath: string }): Promise<appDesc[]> => {

  const appSections = await readdir(allAppsPath)
  const appsNonFlat = await Promise.all(appSections.map(async (appSection) => {
    const apps = await readdir(join(allAppsPath, appSection))
    return apps.map((app) => ({ section: appSection, app }))
  }))
  return (<appDesc[]>[]).concat(...appsNonFlat)
}



const getDefinitelyCordova = async function () {
  const apps = await getAppsAndSections({ allAppsPath: ALL_APPS_PATH })
  const movePromises = []
  for (let app of apps) {
    if (await isCordovaApp({ allAppsPath: ALL_APPS_PATH, appDesc: app })) {
      const src = join(ALL_APPS_PATH, app.section, app.app)
      const dest = join(CORDOVA_APPS_PATH, app.section, app.app)
      const jsSrc = join(dest, 'apktool.decomp', 'assets', 'www')
      const jsDest = join(dest, 'extractedJs')
      movePromises.push(async () => {
        await move(src, dest)
        await copy(jsSrc, jsDest)
      })
    }
  }
  await resolveParallelGroups(chunk(movePromises, 10))
}


async function main() {
  // return await parseScriptsFromSnowbuddy()
  // return await appsReformat()
  // return await getDefinitelyCordova()
  return await parseScriptsFromCordovaApps()
}

main()
// demo()
  .then(() => {
    console.log('Everything is done!')
  })
  .catch((err) => {
    console.log(`Some global error:\n${err}`)
  })

