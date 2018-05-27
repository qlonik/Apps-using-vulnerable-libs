import { relative } from 'path'
import { worker } from 'workerpool'
import {
  analyseCordovaApp,
  APP_TYPES,
  preprocessCordovaApp,
  preprocessReactNativeApp,
} from '../parseApps'
import { analyseLibFiles, extractMainFiles, updateUnionLiteralSignature } from '../parseLibraries'
import { saveFiles } from '../utils/files'
import logger from '../utils/logger'
import { allMessages as messages } from './_all.types'

const logFileName = relative(process.cwd(), __filename)
const makeLog = (fn: string) => logger.child({ name: `${logFileName} >> ${fn}` })

const rllog = makeLog('reanalyse-lib')
const aalog = makeLog('analyse-app')

worker<messages>({
  'reanalyse-lib': async ({ libsPath, lib }) => {
    rllog.trace({ lib }, 'reanalysing lib')

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

    rllog.trace({ lib, main, analysis }, 'finished lib')
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
        aalog.trace({ app }, 'started analysis')
        await analyseCordovaApp({ allAppsPath, libsPath: allLibsPath, app })
        aalog.trace({ app }, 'finished analysis')
        return true
      } catch (err) {
        aalog.error({ err, app }, 'error while analysing cordova app')
        return false
      }
    }

    return false
  },
})

process.on('SIGINT', () => {})
