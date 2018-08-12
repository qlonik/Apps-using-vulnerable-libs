import { APP_TYPES } from '../../parseApps'
import { CordovaManualAnalysisReport } from './index'

export const id = 'cordova/20170726-com.t/com.tomatopie.stickermix8-10-2015_03_12.apk'
export const report: CordovaManualAnalysisReport = {
  app: {
    type: APP_TYPES.cordova,
    section: '20170726-com.t',
    app: 'com.tomatopie.stickermix8-10-2015_03_12.apk',
  },
  files: {
    'head/0000': {
      location: 'head',
      id: '0000',
      type: 'single-lib',
      match: {
        name: 'cordova',
        isGuess: true,
        minified: false,
        comments: 'version is unknown, but PLATFORM_VERSION_BUILD_LABEL = 3.6.4',
      },
    },
    'head/0001': {
      location: 'head',
      id: '0001',
      type: 'single-lib',
      match: {
        name: 'com.admob.AdmobPlugin.AdmobAd',
        isGuess: true,
        minified: false,
        comments: 'exact name is unknown. name is a guess. cordova admob plugin',
      },
    },
    'head/0002': {
      location: 'head',
      id: '0002',
      type: 'single-lib',
      match: {
        name: 'nl.x-services.plugins.socialsharing.SocialSharing',
        isGuess: true,
        minified: false,
        comments: 'name is a guess. social sharing cordova plugin',
      },
    },
    'head/0003': {
      location: 'head',
      id: '0003',
      type: 'single-lib',
      match: {
        name: 'jquery',
        version: '1.11.2',
        file: '0001',
        isGuess: false,
        minified: true,
      },
    },
    'head/0004': {
      location: 'head',
      id: '0004',
      type: 'single-lib',
      match: {
        name: 'bootstrap',
        version: '3.3.2',
        isGuess: false,
        minified: false,
      },
    },
    'head/0005': {
      location: 'head',
      id: '0005',
      type: 'bundle',
      match: [
        {
          name: 'velocity',
          version: '1.2.2',
          isGuess: true,
          minified: true,
          comments: 'name is a guess',
        },
        {
          name: 'velocity-jquery-shim',
          version: '1.0.1',
          isGuess: true,
          minified: true,
          comments: 'name is a guess',
        },
      ],
    },
    'head/0006': {
      location: 'head',
      id: '0006',
      type: 'single-lib',
      match: {
        name: 'velocity ui pack',
        version: '5.0.4',
        isGuess: true,
        minified: true,
        comments: 'name is a guess',
      },
    },
    'head/0007': {
      location: 'head',
      id: '0007',
      type: 'business-logic',
    },
  },
}

// eslint-disable-next-line no-unused-vars
const additionalData = {
  files: {
    'head/0001': {
      algReport: {
        comments: ['library is missing in dataset', 'missing in top1000'],
      },
    },
    'head/0002': {
      algReport: {
        comments: ['library is missing in dataset', 'missing in top1000'],
      },
    },
    'head/0003': {
      algReport: {
        comments: [
          'jquery is only candidate, matched as subset',
          'jquery@1.11.2 - 100%',
          'jquery@1.11.1 - 98.01%',
          'jquery@1.11.1-rc2 - 97.68%',
        ],
      },
    },
    'head/0004': {
      algReport: {
        comments: [
          'bootstrap is only candidate, matched as subset',
          'bootstrap@3.3.1 == bootstrap@3.3.2 - 100% (same % val - 189/189)',
          'bootstrap@3.3.0 - 97.35%',
        ],
      },
    },
    'head/0005': {
      algReport: {
        comments: ['library is missing in dataset', 'missing in top1000'],
      },
    },
    'head/0006': {
      algReport: {
        comments: ['library is missing in dataset', 'missing in top1000'],
      },
    },
  },
}
