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
    'body/0001': {
      location: 'body',
      id: '0001',
      type: 'bundle',
      match: [
        { name: 'angular', version: '1.5.7', file: '0001.json', isGuess: true },
        { name: 'jquery', version: '2.2.4', isGuess: true },
        { name: 'moment', version: '2.10.6', isGuess: true },
        { name: 'lodash', version: '4.14.1', isGuess: true },
        // there is more
      ],
    },
    'body/0002': {
      location: 'body',
      id: '0002',
      type: 'business-logic',
    },
    'body/0003': {
      location: 'body',
      id: '0003',
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

// eslint-disable-next-line no-unused-vars
const additionalData = {
  files: {
    'body/0001': {
      algReport: {
        comments: [
          'angular (27%), jquery (17%), moment (11%), zone.js (10%) are top candidates',
          'angular (@1.5.9 - 14.21%, @1.5.7 - 14.12%, @1.5.8 - 14.1%, @1.5.6 - 14.08%) ' +
            'are top matches',
          'jquery@1.9.1 - 11.82% is also among ranking',
          'core-js@2.5.0 - 11.8% in similarity rank',
        ],
      },
    },
  },
}
