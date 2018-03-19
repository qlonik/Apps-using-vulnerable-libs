import { APP_TYPES } from '../../parseApps'
import { CordovaManualAnalysisReport } from './index'

export const id =
  'cordova/20170726-com.t/com.tiny.m91392d54e89b48a6b2ecf1306f88ebbb-300000016-2017_02_17.apk'
export const report: CordovaManualAnalysisReport = {
  app: {
    type: APP_TYPES.cordova,
    section: '20170726-com.t',
    app: 'com.tiny.m91392d54e89b48a6b2ecf1306f88ebbb-300000016-2017_02_17.apk',
  },
  files: {
    'body/0000': {
      location: 'body',
      id: '0000',
      type: 'bundle',
      match: [
        { name: 'angular', version: '1.4.3', isGuess: false },
        { name: 'underscore', version: '1.7.0', isGuess: false },
        { name: 'lodash', version: '2.4.2', isGuess: false },
        { name: 'ng-animate', version: '1.4.3', isGuess: true },
        { name: 'ng-sanitize', version: '1.4.3', isGuess: true },
        { name: 'angular-ui-router', version: '0.2.13', isGuess: false },
        { name: 'localForage', version: '1.2.0', isGuess: false },
        { name: 'angular-translate', version: '2.6.1', isGuess: false },
        { name: 'jssha', isGuess: true, comments: 'http://caligatio.github.com/jsSHA/' },
        { name: 'immutable', isGuess: true, comments: 'global variable is exposed' },
        { name: 'jquery', version: '2.2.2', isGuess: false, comments: 'includes Sizzle.js' },
        {
          name: '???',
          isGuess: true,
          comments: 'some unknown lib, with comments in chinese, which references sha1',
        },
        { name: 'imgcache.js', version: '1.0.0', isGuess: true },
        { name: 'ng-youtube-embed', isGuess: true },
        { name: 'add to homescreen', version: '3.2.2', isGuess: true },
        { name: 'pdfjs', version: '1.1.337', isGuess: false, comments: 'build #: 61f9052' },
        {
          name: 'ngprogress',
          version: '1.1.2',
          isGuess: false,
          comments: 'https://github.com/VictorBjelkholm/ngProgress',
        },
        {
          name: 'angular-google-maps',
          version: '2.0.12',
          isGuess: false,
          comments: 'https://github.com/angular-ui/angular-google-maps',
        },
        { name: 'ionic', version: '1.1.0', isGuess: true },
        { name: 'angular-ionic', version: '1.1.0', isGuess: true },
        {
          name: 'angular-localforage',
          version: '1.2.2',
          isGuess: false,
          comments: 'https://github.com/ocombe/angular-localForage',
        },
        { name: 'jQuery Waypoints', version: '2.0.5', isGuess: false },
        { name: 'angular-pdf', version: '1.0.2', isGuess: false },
        {
          name: 'Angulartics',
          version: '0.17.2',
          isGuess: false,
          comments: 'multiple different modules included as part of this package',
        },
      ],
      comments: 'non-minified\n' + 'possibly included pdfjs twice',
    },
    'body/0001': {
      location: 'body',
      id: '0001',
      type: 'single-lib',
      match: {
        name: 'cordova',
        isGuess: true,
        comments: 'version is unknown, but PLATFORM_VERSION_BUILD_LABEL = 5.1.1',
      },
    },
    'body/0002': {
      location: 'body',
      id: '0002',
      type: 'business-logic', // maybe
    },
    'body/0003': {
      location: 'body',
      id: '0003',
      type: 'business-logic', // maybe
      comments: 'minified',
    },

    'head/0000': { location: 'head', id: '0000', type: 'business-logic' },
    'head/0001': { location: 'head', id: '0001', type: 'http-script' },
    'head/0002': { location: 'head', id: '0002', type: 'business-logic', comments: 'minified' },
    'head/0003': { location: 'head', id: '0003', type: 'business-logic', comments: 'minified' },
    'head/0004': {
      location: 'head',
      id: '0004',
      type: 'single-lib',
      match: {
        name: 'jstz',
        version: '1.0.4',
        isGuess: false,
        comments: 'minified',
      },
    },
  },
}
