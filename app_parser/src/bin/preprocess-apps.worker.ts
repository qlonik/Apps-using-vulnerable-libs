import { worker } from 'workerpool'
import { APP_TYPES, preprocessCordovaApp, preprocessReactNativeApp } from '../parseApps'
import { messages } from './preprocess-apps'

worker<messages>({
  preprocess: async ({ allAppsPath, allLibsPath, app: { type, section, app } }) => {
    if (type === APP_TYPES.reactNative) {
      try {
        await preprocessReactNativeApp({ allAppsPath, allLibsPath, app: { type, section, app } })
        return true
      } catch {
        return false
      }
    }

    if (type === APP_TYPES.cordova) {
      try {
        await preprocessCordovaApp({ allAppsPath, allLibsPath, app: { type, section, app } })
        return true
      } catch {
        return false
      }
    }

    return false
  },
})

process.on('SIGINT', () => {})
