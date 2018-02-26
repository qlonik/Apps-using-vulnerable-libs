import { promisify } from 'util'
import { worker } from 'workerpool'
import { APP_TYPES, preprocessCordovaApp } from '../parseApps'
import { stdoutLog } from '../utils/logger'
import { messages } from './preprocess-apps'

const log = stdoutLog('preprocess-apps:worker')
const timeout = promisify(setTimeout)

worker<messages>({
  preprocess: async ({ allAppsPath, app: { type, section, app } }) => {
    if (type === APP_TYPES.reactNative) {
      return false
    }

    if (type === APP_TYPES.cordova) {
      try {
        await preprocessCordovaApp({ allAppsPath, app: { type, section, app } })
        return true
      } catch {
        return false
      }
    }

    return false
  },
})

process.on('SIGINT', () => {})
