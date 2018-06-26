import { pathExists, readdir, readJSON } from 'fs-extra'
import { groupBy } from 'lodash'
import { join } from 'path'
import { APP_TYPES, appDesc, getApps } from '../parseApps'
import { FINISHED_ANALYSIS_FILE, FINISHED_PREPROCESSING_FILE } from '../parseApps/constants'
import { getLibNameVersions } from '../parseLibraries'
import { stdoutLog } from '../utils/logger'
import { MainFn } from './_all.types'

const LIB_FOLDER = '../data/sample_libs'
const APP_FOLDER = '../data/sample_apps'
const FIN_PRE_APPS_PATH = join(APP_FOLDER, FINISHED_PREPROCESSING_FILE)
const FIN_AN_APPS_PATH = join(APP_FOLDER, FINISHED_ANALYSIS_FILE)
const APP_POOL_FOLDER = '/gi-pool/appdata-ro'

const log = stdoutLog('data-status')
log.enabled = true

export const main: MainFn = async function main() {
  if (await pathExists(LIB_FOLDER)) {
    const libs = await getLibNameVersions(LIB_FOLDER)

    log('total libs+vers:           %o', libs.length)
  }

  if (await pathExists(APP_FOLDER)) {
    const cordovaApps = await getApps(APP_FOLDER, APP_TYPES.cordova)
    const rnApps = await getApps(APP_FOLDER, APP_TYPES.reactNative)

    log('total cordova:             %o', cordovaApps.length)
    log('total react-native:        %o', rnApps.length)
  }

  if (await pathExists(FIN_PRE_APPS_PATH)) {
    const preprocessed = (await readJSON(FIN_PRE_APPS_PATH)) as appDesc[]
    const appTypes = groupBy(preprocessed, 'type')
    const cordova = appTypes[APP_TYPES.cordova] || []
    const reactNative = appTypes[APP_TYPES.reactNative] || []

    log('preprocessed cordova:      %o', cordova.length)
    log('preprocessed react-native: %o', reactNative.length)
  }

  if (await pathExists(FIN_AN_APPS_PATH)) {
    const analysed = (await readJSON(FIN_AN_APPS_PATH)) as appDesc[]
    const appTypes = groupBy(analysed, 'type')
    const cordova = appTypes[APP_TYPES.cordova] || []
    const reactNative = appTypes[APP_TYPES.reactNative] || []

    log('analysed cordova:          %o', cordova.length)
    log('analysed react-native:     %o', reactNative.length)
  }

  if (await pathExists(APP_POOL_FOLDER)) {
    const sections = await readdir(APP_POOL_FOLDER)
    const apps = await sections.reduce(async (acc, section) => {
      const prev = await acc
      const sectionApps = await readdir(join(APP_POOL_FOLDER, section))
      return prev.concat(sectionApps.map((app) => ({ section, app })))
    }, Promise.resolve([] as { section: string; app: string }[]))

    log('total apps in pool:        %o', apps.length)
  }
}
