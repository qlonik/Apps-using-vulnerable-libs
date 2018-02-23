import { copy, move, pathExists, remove } from 'fs-extra'
import { join } from 'path'
import { opts, resolveAllOrInParallel } from '../utils'
import {
  AppParserFn,
  AppsFolderParserFn,
  getAppsAndSections,
  IsAppTypeFn,
  MoveAppTypeFn
} from './index'


export const isReactNativeApp: IsAppTypeFn = async function (
  { appPath }): Promise<boolean> {

  const bundlePath = [appPath, 'assets', 'index.android.bundle']
  return await pathExists(join(...bundlePath))
}

export const parseScriptsFromReactNativeApp: AppParserFn = async function (
  { appPath, libsPath },
  {
    debugDoLess = false,
    chunkLimit = 10,
    chunkSize = 10,
  }: opts = {}) {

}

export const parseScriptsFromReactNativeApps: AppsFolderParserFn = async function (
  { allAppsPath, libsPath },
  {
    debugDoLess = false,
    chunkLimit = 10,
    chunkSize = 5,
  }: opts = {}) {

  const apps = await getAppsAndSections({ allAppsPath })
  const lazyAppAnalysis = apps.map((app) => {
    return async () => parseScriptsFromReactNativeApp({
      appPath: join(allAppsPath, app.section, app.app),
      libsPath,
    })
  })
  if (debugDoLess) {
    await Promise.all([
      lazyAppAnalysis[0](),
      lazyAppAnalysis[1](),
    ])
  }
  else {
    await resolveAllOrInParallel(lazyAppAnalysis, { chunkLimit, chunkSize })
  }
}
