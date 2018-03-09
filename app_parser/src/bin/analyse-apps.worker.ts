import { worker } from 'workerpool'
import { analyseCordovaApp, APP_TYPES } from '../parseApps'
import { stdoutLog } from '../utils/logger'
import { messages } from './analyse-apps'

const log = stdoutLog(`analyse-apps:worker:${process.pid}`)

worker<messages>({
  analyse: async ({ allAppsPath, allLibsPath, app }) => {
    if (app.type === APP_TYPES.reactNative) {
      return false
    }

    if (app.type === APP_TYPES.cordova) {
      try {
        log('started  analysing %o', `${app.type}/${app.section}/${app.app}`)
        await analyseCordovaApp({ allAppsPath, libsPath: allLibsPath, app })
        log('finished analysing %o', `${app.type}/${app.section}/${app.app}`)
        return true
      } catch (err) {
        log(err)
        return false
      }
    }

    return false
  },
})

process.on('SIGINT', () => {})
