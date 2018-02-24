import { pathExists } from 'fs-extra'
import { join } from 'path'
import { opts, resolveAllOrInParallel } from '../utils'
import { APP_TYPES, getApps } from './getters'
import { AppParserFn, AppsFolderParserFn, IsAppTypeFn } from './index'

export const isReactNativeApp: IsAppTypeFn = async function({ appPath }): Promise<boolean> {
  const bundlePath = [appPath, 'assets', 'index.android.bundle']
  return await pathExists(join(...bundlePath))
}

export const parseScriptsFromReactNativeApp: AppParserFn = async function(
  { appPath, libsPath },
  { debugDoLess = false, chunkLimit = 10, chunkSize = 10, conservative = true }: opts = {},
) {}

export const parseScriptsFromReactNativeApps: AppsFolderParserFn = async function(
  { allAppsPath, libsPath },
  { debugDoLess = false, chunkLimit = 10, chunkSize = 5 }: opts = {},
) {
  const apps = await getApps(allAppsPath, APP_TYPES.reactNative)
  const lazyAppAnalysis = apps.map(({ type, section, app }) => {
    return async () =>
      parseScriptsFromReactNativeApp({
        appPath: join(allAppsPath, type, section, app),
        libsPath,
      })
  })
  if (debugDoLess) {
    await Promise.all([lazyAppAnalysis[0](), lazyAppAnalysis[1]()])
  } else {
    await resolveAllOrInParallel(lazyAppAnalysis, { chunkLimit, chunkSize })
  }
}
