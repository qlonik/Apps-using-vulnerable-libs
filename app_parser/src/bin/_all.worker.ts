import { copy, mkdirp, move, remove } from 'fs-extra'
import { join, relative } from 'path'
import shell from 'shelljs'
import { worker } from 'workerpool'
import {
  analyseCordovaApp,
  APP_TYPES,
  isCordovaApp,
  isReactNativeApp,
  preprocessCordovaApp,
  preprocessReactNativeApp,
} from '../parseApps'
import { APK_FILE } from '../parseApps/constants'
import {
  analyseLibFiles,
  extractMainFiles,
  extractSingleLibraryFromDump,
  updateUnionLiteralSignature,
} from '../parseLibraries'
import { saveFiles } from '../utils/files'
import logger from '../utils/logger'
import { allMessages as messages } from './_all.types'

const logFileName = relative(process.cwd(), __filename)
const makeLog = (fn: string) => logger.child({ name: `${logFileName} >> ${fn}` })

const ellog = makeLog('extract-lib-from-dump')
const rllog = makeLog('reanalyse-lib')
const aalog = makeLog('analyse-app')

worker<messages>({
  'reanalyse-lib': async ({ libsPath, lib }) => {
    rllog.debug({ lib }, 'reanalysing lib')

    const main = await saveFiles(extractMainFiles({ libsPath, ...lib }, { conservative: true }))
    if (main.length === 0) {
      rllog.warn({ lib }, 'no main files')
      return
    }
    const analysis = await saveFiles(analyseLibFiles(main, { conservative: false }))
    if (analysis.length === 0) {
      rllog.warn({ lib }, 'no analysis files')
      return
    }
    await updateUnionLiteralSignature({ libsPath, ...lib })

    rllog.debug({ lib, main, analysis }, 'finished lib')
  },

  'preprocess-app': async ({ allAppsPath, allLibsPath, app }) => {
    if (app.type === APP_TYPES.reactNative) {
      try {
        await preprocessReactNativeApp({ allAppsPath, allLibsPath, app })
        return true
      } catch {
        return false
      }
    }

    if (app.type === APP_TYPES.cordova) {
      try {
        await preprocessCordovaApp({ allAppsPath, allLibsPath, app })
        return true
      } catch {
        return false
      }
    }

    return false
  },

  'analyse-app': async ({ allAppsPath, allLibsPath, app }) => {
    if (app.type === APP_TYPES.reactNative) {
      return false
    }

    if (app.type === APP_TYPES.cordova) {
      try {
        aalog.debug({ app }, 'started analysis')
        await analyseCordovaApp({ allAppsPath, libsPath: allLibsPath, app })
        aalog.debug({ app }, 'finished analysis')
        return true
      } catch (err) {
        aalog.error({ err, app }, 'error while analysing cordova app')
        return false
      }
    }

    return false
  },

  'extract-lib-from-dump': async ({ libsPath, dumpPath, filename }) => {
    let name
    let version
    try {
      const libDesc = await extractSingleLibraryFromDump({ dumpPath, libsPath, filename })
      name = libDesc.name
      version = libDesc.version
    } catch (err) {
      ellog.error({ err, filename }, 'Could not parse the filename')
      return false
    }

    const main = await saveFiles(extractMainFiles({ libsPath, name, version }))
    const analysis = await saveFiles(analyseLibFiles(main))
    if (analysis.length > 0) {
      await updateUnionLiteralSignature({ libsPath, name, version })
    }

    return true
  },

  're-extract-app': async ({ inputPath, outputPath, app }) => {
    const apkIn = join(inputPath, app.type, app.section, app.app, 'app.apk')
    const outDir = join(outputPath, app.type, app.section, app.app)

    await mkdirp(outDir)

    shell.exec(`apktool d ${JSON.stringify(apkIn)} -qfo ${JSON.stringify(outDir)}`, {
      silent: true,
    })

    return true
  },

  'extract-app': async ({ inputPath, outputPath, section, app }) => {
    const apkIn = join(inputPath, section, app)
    const outDir = join(outputPath, section, app)

    await mkdirp(outDir)

    shell.exec(`apktool d ${JSON.stringify(apkIn)} -qfo ${JSON.stringify(outDir)}`, {
      silent: true,
    })

    return true
  },

  'move-decomp-app': async ({ inputPath, outputPath, section, app }) => {
    const appPath = join(inputPath, section, app)

    if (await isCordovaApp({ appPath })) {
      const inAppPath = join(appPath, 'assets', 'www')
      const outAppPath = join(outputPath, 'cordova', section, app, 'js')

      await move(inAppPath, outAppPath, { overwrite: true })
      await remove(appPath)
      return APP_TYPES.cordova
    } else if (await isReactNativeApp({ appPath })) {
      const inAppPath = join(appPath, 'assets', 'index.android.bundle')
      const outAppPath = join(outputPath, 'react-native', section, app, 'bundle.js')

      await move(inAppPath, outAppPath, { overwrite: true })
      await remove(appPath)
      return APP_TYPES.reactNative
    } else {
      await remove(appPath)
      return 'removed'
    }
  },

  'copy-apk': async ({ inputPath, outputPath, type, section, app }) => {
    const apkPath = join(inputPath, section, app)
    const outputApkPath = join(outputPath, type, section, app, APK_FILE)

    await copy(apkPath, outputApkPath)

    return true
  },
})

process.on('SIGINT', () => {})
