import { APP_TYPES } from '../../parseApps'
import { CordovaManualAnalysisReport } from './index'

export const id = 'cordova/20170726-a_b/apps.yclients88759-10300-2017_04_13.apk'
export const report: CordovaManualAnalysisReport = {
  app: {
    type: APP_TYPES.cordova,
    section: '20170726-a_b',
    app: 'apps.yclients88759-10300-2017_04_13.apk',
  },
  files: {
    'body/0000': {
      location: 'body',
      id: '0000',
      type: 'bundle',
      match: [
        { name: 'angular', version: '1.5.7', file: '0001.json', isGuess: true },
        // there is more
      ],
    },
    'body/0001': {
      location: 'body',
      id: '0001',
      type: 'business-logic',
    },
    'body/0002': {
      location: 'body',
      id: '0002',
      type: 'business-logic',
    },
    'head/0000': {
      location: 'head',
      id: '0000',
      type: 'unknown',
      match: {
        name: 'cordova',
        isGuess: true,
        comments: 'version is unknown, but PLATFORM_VERSION_BUILD_LABEL = 6.1.2',
      },
    },
  },
}
