import { copy, mkdirp, move, readJSON, remove } from 'fs-extra'
import { memoize } from 'lodash/fp'
import { join, relative } from 'path'
import shell from 'shelljs'
import { worker } from 'workerpool'
import { extractStructure, signatureWithComments } from '../extractStructure'
import {
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
  extractNameVersionFromFilename,
  extractSingleLibraryFromDump,
  updateUnionLiteralSignature,
} from '../parseLibraries'
import { isInBlacklist } from '../pkgBlacklist'
import { bundle_similarity_fn, candidateLib } from '../similarityIndex'
import { fileOp, saveFiles } from '../utils/files'
import logger from '../utils/logger'
import { allMessages as messages, CouchDumpFormat, DONE } from './_all.types'

const logFileName = relative(process.cwd(), __filename)
const makeLog = (fn: string) => logger.child({ name: `${logFileName} >> ${fn}` })

const ellog = makeLog('extract-lib-from-dump')
const rllog = makeLog('reanalyse-lib')
const siLog = makeLog('bundle_similarity_fn')

const memoReadJSON = memoize((p: string): Promise<any> => readJSON(p))

worker<messages>({
  bundle_similarity_fn: async ({ libsPath, signaturePath, candidatesPath, log: logData, fn }) => {
    const candidates = (await readJSON(candidatesPath)) as candidateLib[]
    if (candidates.length === 0) {
      return true
    }

    const signature = (await readJSON(signaturePath)) as signatureWithComments
    const log = siLog.child(logData)

    log.debug('>-> started bundle_similarity_fn on worker')
    const start = process.hrtime()
    const res = await bundle_similarity_fn({ libsPath, signature, candidates, log, fn })
    const end = process.hrtime(start)
    log.debug({ 'file-time-taken': end }, '>-> finished bundle_similarity_fn on worker')

    return { time: end, sim: res }
  },

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

  'preprocess-app': async ({ allAppsPath, appsAnalysisPath, allLibsPath, app }) => {
    if (app.type === APP_TYPES.reactNative) {
      try {
        await preprocessReactNativeApp({ allAppsPath, appsAnalysisPath, allLibsPath, app })
        return true
      } catch {
        return false
      }
    }

    if (app.type === APP_TYPES.cordova) {
      try {
        await preprocessCordovaApp({ allAppsPath, appsAnalysisPath, allLibsPath, app })
        return true
      } catch {
        return false
      }
    }

    return false
  },

  /**
   * Function which extracts and analyses one library from the dump. It returns the lib .tgz into
   * failed portion of the dump, if it can't be parsed.
   *
   * remark: rewrite this function and its supporting functions
   *   Supporting functions: {@link extractSingleLibraryFromDump}, {@link extractMainFiles},
   *   {@link analyseLibFiles}, and {@link updateUnionLiteralSignature}
   *
   * @param libsPath
   * @param dumpPath
   * @param filename
   * @param VERSIONS_PATH
   * @param D
   */
  'extract-lib-from-dump': async ({ libsPath, dumpPath, filename, VERSIONS_PATH, DATE: D }) => {
    const VERSIONS = (await memoReadJSON(VERSIONS_PATH)) as CouchDumpFormat
    const DATE = new Date(D)
    const exclDir = `${dumpPath}.excl`
    const dumpPathFailed = `${dumpPath}.failed`
    const emptySigPath = `${dumpPath}.empty-sig`

    const libDesc = extractNameVersionFromFilename(filename)
    if (libDesc === null) {
      ellog.error({ filename }, 'Could not parse the filename')
      return DONE.failParseName
    }
    const { name, version } = libDesc

    const versionTimeMap = VERSIONS[name]
    if (versionTimeMap) {
      const versionTime = versionTimeMap[version]
      if (versionTime) {
        const time = new Date(versionTime)
        if (time > DATE) {
          await mkdirp(exclDir)
          await move(join(dumpPath, filename), join(exclDir, filename))
          return DONE.exclTime
        }
      }
    }
    if (isInBlacklist({ name, version })) {
      await mkdirp(exclDir)
      await move(join(dumpPath, filename), join(exclDir, filename))
      return DONE.exclBL
    }

    type UnboxPromise<T> = T extends Promise<infer R> ? R : never

    try {
      await extractSingleLibraryFromDump({ dumpPath, libsPath, filename })
      const main = await saveFiles(extractMainFiles({ libsPath, name, version }))
      const analysisFiles = await analyseLibFiles(main)

      const someAnalysisSigsAreEmpty = analysisFiles.some(
        (v) =>
          v.type === fileOp.json &&
          (v.json as UnboxPromise<ReturnType<typeof extractStructure>>).functionSignature.length ===
            0,
      )

      if (someAnalysisSigsAreEmpty) {
        await mkdirp(emptySigPath)
        await move(join(libsPath, name, version, filename), join(emptySigPath, filename))
        await remove(join(libsPath, name, version))

        return DONE.emptySig
      } else {
        await saveFiles(analysisFiles)
      }
    } catch (err) {
      ellog.error({ err }, 'error while extracting')

      await mkdirp(dumpPathFailed)
      await move(join(libsPath, name, version, filename), join(dumpPathFailed, filename))
      await remove(join(libsPath, name, version))

      return DONE.fail
    }

    return DONE.ok
  },

  'create-lib-literal-sig': async ({ libsPath, name }) => {
    await updateUnionLiteralSignature({ libsPath, name })
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
