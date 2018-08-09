import { APP_TYPES } from '../../parseApps'
import { CordovaManualAnalysisReport } from './index'

export const id = 'cordova/20170726-com.p/com.paynopain.easyGOband-18-2017_04_04.apk'
export const report: CordovaManualAnalysisReport = {
  app: {
    type: APP_TYPES.cordova,
    section: '20170726-com.p',
    app: 'com.paynopain.easyGOband-18-2017_04_04.apk',
  },
  files: {
    'head/0000': {
      location: 'head',
      id: '0000',
      type: 'single-lib',
      match: {
        name: 'cordova',
        isGuess: true,
        comments: 'version is unknown, but PLATFORM_VERSION_BUILD_LABEL = 4.1.1',
      },
    },
    'head/0001': {
      location: 'head',
      id: '0001',
      type: 'bundle',
      match: [
        { name: 'ionic', version: '1.2.4-nightly-1917', isGuess: false },
        { name: 'angular', version: '1.4.3', isGuess: false },
        { name: 'angular-animate', version: '1.4.3', isGuess: false },
        { name: 'angular-sanitize', version: '1.4.3', isGuess: false },
        { name: 'angular-ui-router', version: '0.2.13', isGuess: false },
        { name: 'ionic-angular', version: '1.2.4-nightly-1917', isGuess: false },
      ],
    },
    'head/0002': {
      location: 'head',
      id: '0002',
      type: 'single-lib',
      match: {
        name: 'ngCordova',
        version: '0.1.27-alpha',
        isGuess: true,
        comments: 'file with bunch of cordova plugins',
      },
    },
    'head/0003': {
      location: 'head',
      id: '0003',
      type: 'single-lib',
      match: { name: 'jquery', version: '2.1.4', file: '0001.json', isGuess: false },
    },
    'head/0004': {
      location: 'head',
      id: '0004',
      type: 'single-lib',
      match: {
        name: 'angular-local-storage',
        version: '0.2.6',
        isGuess: false,
        comments: 'minified',
      },
    },
    'head/0005': {
      location: 'head',
      id: '0005',
      type: 'unknown',
      match: { name: 'angular-validation', isGuess: true },
    },
    'head/0006': {
      location: 'head',
      id: '0006',
      type: 'unknown',
      match: { name: 'angular-validation', isGuess: true },
    },
    'head/0007': {
      location: 'head',
      id: '0007',
      type: 'single-lib',
      match: {
        name: 'moment',
        version: '2.9.0',
        file: '0000.json',
        isGuess: false,
        comments: 'minified',
      },
    },
    'head/0008': {
      location: 'head',
      id: '0008',
      type: 'unknown',
      match: { name: 'HumanizeDuration', isGuess: true },
    },
    'head/0009': {
      location: 'head',
      id: '0009',
      type: 'single-lib',
      match: { name: 'angular-timer', version: '1.3.4', isGuess: false, comments: 'minified' },
    },
    'head/0010': {
      location: 'head',
      id: '0010',
      type: 'single-lib',
      match: {
        name: 'wheelzoom',
        version: '3.0.4',
        isGuess: false,
        comments: 'non-minified',
      },
    },
    'head/0011': {
      location: 'head',
      id: '0011',
      type: 'single-lib',
      match: {
        name: 'angular-translate',
        version: '2.13.0',
        isGuess: false,
        comments: 'minified',
      },
    },

    'head/0012': { location: 'head', id: '0012', type: 'business-logic' },
    'head/0013': { location: 'head', id: '0013', type: 'business-logic' },
    'head/0014': { location: 'head', id: '0014', type: 'business-logic' },
    'head/0015': { location: 'head', id: '0015', type: 'business-logic' },
    'head/0016': { location: 'head', id: '0016', type: 'business-logic' },
    'head/0017': { location: 'head', id: '0017', type: 'business-logic' },
    'head/0018': { location: 'head', id: '0018', type: 'business-logic' },
    'head/0019': { location: 'head', id: '0019', type: 'business-logic' },
    'head/0020': { location: 'head', id: '0020', type: 'business-logic' },
    'head/0021': { location: 'head', id: '0021', type: 'business-logic' },
    'head/0022': { location: 'head', id: '0022', type: 'business-logic' },
    'head/0023': { location: 'head', id: '0023', type: 'business-logic' },
    'head/0024': { location: 'head', id: '0024', type: 'business-logic' },
    'head/0025': { location: 'head', id: '0025', type: 'business-logic' },
    'head/0026': { location: 'head', id: '0026', type: 'business-logic' },
    'head/0027': { location: 'head', id: '0027', type: 'business-logic' },
    'head/0028': { location: 'head', id: '0028', type: 'business-logic' },
    'head/0029': { location: 'head', id: '0029', type: 'business-logic' },
    'head/0030': { location: 'head', id: '0030', type: 'business-logic' },
    'head/0031': { location: 'head', id: '0031', type: 'business-logic' },
    'head/0032': { location: 'head', id: '0032', type: 'business-logic' },
    'head/0033': { location: 'head', id: '0033', type: 'business-logic' },
    'head/0034': { location: 'head', id: '0034', type: 'business-logic' },
    'head/0035': { location: 'head', id: '0035', type: 'business-logic' },
    'head/0036': { location: 'head', id: '0036', type: 'business-logic' },
    'head/0037': { location: 'head', id: '0037', type: 'business-logic' },
    'head/0038': { location: 'head', id: '0038', type: 'business-logic' },
    'head/0039': { location: 'head', id: '0039', type: 'business-logic' },
    'head/0040': { location: 'head', id: '0040', type: 'business-logic' },
    'head/0041': { location: 'head', id: '0041', type: 'business-logic' },
    'head/0042': { location: 'head', id: '0042', type: 'business-logic' },
    'head/0043': { location: 'head', id: '0043', type: 'business-logic' },
    'head/0044': { location: 'head', id: '0044', type: 'business-logic' },
    'head/0045': { location: 'head', id: '0045', type: 'business-logic' },
  },
}

// eslint-disable-next-line no-unused-vars
const additionalData = {
  files: {
    'head/0000': {
      algReport: {
        comments: ['library is missing in dataset', 'missing in top1000'],
      },
    },
    'head/0001': {
      algReport: {
        comments: [
          'angular is a top candidate - 30.98%',
          'angular@1.4.2 == angular@1.4.3 - 38.53% (exactly the same % value - 1349/3501)',
          'angular@1.4.4 - 38.2453%',
          'angular-animate, angular-sanitize, angular-ui-router all appear in top 1000',
          'ionic, ionic-angular do not appear in top 1000 (maybe not distributed by themselves)',
        ],
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
          'jquery is a single candidate, matched as subset',
          'jquery@2.1.4 - 100%',
          'jquery@2.1.2 == jquery@2.1.3 - 80.90% (exactly the same % value - 500/618)',
        ],
      },
    },
    'head/0004': {
      algReport: {
        comments: ['library is missing in dataset', 'missing in top1000'],
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
    'head/0007': {
      algReport: {
        comments: [
          'moment is a top candidate - 40.45%',
          'moment@2.9.0 - 46.47%',
          'moment@2.8.4 - 43.95%',
          'moment@2.8.1 - 43.75%',
        ],
      },
    },
    'head/0009': {
      algReport: {
        comments: ['library is missing in dataset', 'missing in top1000'],
      },
    },
    'head/0010': {
      algReport: {
        comments: ['library is missing in dataset', 'missing in top1000'],
      },
    },
    'head/0011': {
      algReport: {
        comments: ['library is missing in dataset', 'missing in top1000'],
      },
    },
  },
}
