import { mkdirp, pathExists, readFile } from 'fs-extra'
import { isString } from 'lodash'
import { join } from 'path'
import { extractReactNativeStructure } from '../extractStructure'
import { opts, resolveAllOrInParallel } from '../utils'
import { fileOp, saveFiles } from '../utils/files'
import { APP_TYPES, appDesc, getApps } from './getters'
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

export const preprocessReactNativeApp = async (
  {
    allAppsPath,
    app: { type, section, app },
  }: {
    allAppsPath: string
    app: appDesc
  },
  { conservative = false }: opts = {},
) => {
  const appPath = join(allAppsPath, type, section, app)

  const bundlePath = join(appPath, 'bundle.js')
  const bundleContent = await readFile(bundlePath, 'utf-8')
  const parsedBundle = await extractReactNativeStructure({ content: bundleContent })

  const jsAnalysisPath = join(appPath, 'an')
  await mkdirp(jsAnalysisPath)

  const lazy = parsedBundle.map(({ id, functionSignature, literalSignature }) => async () => {
    const cwd = join(jsAnalysisPath, isString(id) ? `s_${id}` : `n_${id}`)
    const dst = 'sig.json'
    await saveFiles({
      cwd,
      dst,
      type: fileOp.json,
      json: { functionSignature, literalSignature },
      conservative,
    })
  })

  return await resolveAllOrInParallel(lazy)
}
