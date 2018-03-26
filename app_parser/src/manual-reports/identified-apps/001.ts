import { APP_TYPES } from '../../parseApps'
import { CordovaManualAnalysisReport } from './index'

export const id = 'cordova/20170726-a_b/br.com.williarts.radiovox-20008-2017_01_25.apk'
export const report: CordovaManualAnalysisReport = {
  app: {
    type: APP_TYPES.cordova,
    section: '20170726-a_b',
    app: 'br.com.williarts.radiovox-20008-2017_01_25.apk',
  },
  files: {
    'head/0000': {
      location: 'head',
      id: '0000',
      type: 'single-lib',
      match: {
        name: 'bluebird',
        version: '3.4.6',
        file: undefined,
        isGuess: false,
        comments: 'minified. also possibly custom build.',
      },
      algReport: {
        comments: [
          'top candidate match is correct - bluebird',
          'but bluebird didnt make it into similarities ' +
            '(maybe because our bluebird is non-minified, but there it was minified)',
        ],
      },
    },
    'head/0001': {
      location: 'head',
      id: '0001',
      type: 'bundle',
      match: [
        { name: 'ionic', version: '1.3.1', isGuess: false },
        { name: 'angular', version: '1.5.3', isGuess: false },
        { name: 'angular-animate', version: '1.5.3', isGuess: false },
        { name: 'angular-sanitize', version: '1.5.3', isGuess: false },
        { name: 'angular-ui-router', version: '0.2.13', isGuess: false },
        { name: 'ionic-angular', version: '1.3.1', isGuess: false },
      ],
      algReport: {
        comments: [
          'candidates include angular (angular is top candidate)',
          'angular is a top match (angular@1.5.3 - 40.2446%)',
          'different versions of angular are in the top 100',
        ],
      },
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
      algReport: {
        comments: ['this library does not appear in top1000'],
      },
    },
    'head/0003': {
      location: 'head',
      id: '0003',
      type: 'single-lib',
      match: {
        name: 'moment',
        version: '2.17.1',
        isGuess: false,
        comments: 'minified',
      },
      algReport: {
        comments: [
          'moment is a top candidate with 50% chance',
          'however moment didnt make it into similarity ranking ' +
            '(maybe because we compare minified vs non-minified?)',
        ],
      },
    },
    'head/0004': {
      location: 'head',
      id: '0004',
      type: 'single-lib',
      match: {
        name: 'angular-moment',
        isGuess: true,
        comments: 'minified',
      },
      algReport: {
        comments: [
          'this library is missing in our dataset',
          'therefore neither candidates nor similarities are correct',
        ],
      },
    },
    'head/0005': {
      location: 'head',
      id: '0005',
      type: 'unknown',
      match: {
        name: 'moment-locale',
        isGuess: true,
        comments: 'pt-br locale file for moment.js',
      },
      algReport: {
        comments: [
          'this library is missing in our dataset',
          'it does not appear in top 1000 either',
        ],
      },
    },
    'head/0006': {
      location: 'head',
      id: '0006',
      type: 'single-lib',
      match: {
        name: 'cordova',
        isGuess: true,
        comments: 'version is unknown, but PLATFORM_VERSION_BUILD_LABEL = 6.0.0',
      },
    },

    'head/0007': { location: 'head', id: '0007', type: 'business-logic' },
    'head/0008': { location: 'head', id: '0008', type: 'business-logic' },
    'head/0009': { location: 'head', id: '0009', type: 'business-logic' },
    'head/0010': { location: 'head', id: '0010', type: 'business-logic' },
    'head/0011': { location: 'head', id: '0011', type: 'business-logic' },
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
    'head/0046': { location: 'head', id: '0046', type: 'business-logic' },
    'head/0047': { location: 'head', id: '0047', type: 'business-logic' },
    'head/0048': { location: 'head', id: '0048', type: 'business-logic' },
    'head/0049': { location: 'head', id: '0049', type: 'business-logic' },
    'head/0050': { location: 'head', id: '0050', type: 'business-logic' },
  },
}
