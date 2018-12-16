import { APP_TYPES, cordovaAnalysisFile } from '../parseApps'
import { libName, libNameVersion } from '../parseLibraries'
import { descriptor, METHODS_TYPE } from './analyse-specified'

export type toAnalyseType = {
  /**
   * Methods to use
   */
  methods: '*' | METHODS_TYPE | METHODS_TYPE[]
  /**
   * App to analyse
   */
  app: descriptor['app']
  /**
   * Files to analyse
   */
  files: descriptor['file'][]
  /**
   * Libraries to compare against
   */
  libs: (
    | '*'
    | ((libName | libNameVersion | descriptor['lib']) & {
        /**
         * Target version of the detected library
         */
        shouldBeVersion?: string
        /**
         * Target file to contain detected library
         */
        shouldBeInFile?: string | string[]
      }))[]
}
export const TO_ANALYSE: toAnalyseType[] = [
  /* specify the config */
  {
    methods: ['fn-st-toks-v5'],
    app: {
      type: APP_TYPES.cordova,
      section: '20170726-a_b',
      app: 'apps.yclients88759-10300-2017_04_13.apk',
    },
    files: [{ path: 'body/0000', location: 'body', id: '0000' }] as cordovaAnalysisFile[],
    libs: [
      { name: 'angular', shouldBeVersion: '1.5.7', shouldBeInFile: 'body/0000' },
      { name: 'jquery', shouldBeVersion: '2.2.4', shouldBeInFile: 'body/0000' },
      { name: 'moment', shouldBeVersion: '2.10.6', shouldBeInFile: 'body/0000' },
      { name: 'lodash', shouldBeVersion: '4.14.1', shouldBeInFile: 'body/0000' },
      { name: 'react', shouldBeInFile: 'none' },
      { name: 'ramda', shouldBeInFile: 'none' },
      { name: 'async', shouldBeInFile: 'none' },
      { name: 'glob', shouldBeInFile: 'none' },
      { name: 'uuid', shouldBeInFile: 'none' },
    ],
  },
  {
    methods: ['fn-st-toks-v5'],
    app: {
      type: APP_TYPES.cordova,
      section: '20170726-a_b',
      app: 'br.com.williarts.radiovox-20008-2017_01_25.apk',
    },
    files: [
      { path: 'head/0000', location: 'head', id: '0000' },
      { path: 'head/0001', location: 'head', id: '0001' },
      { path: 'head/0002', location: 'head', id: '0002' },
      { path: 'head/0003', location: 'head', id: '0003' },
      { path: 'head/0004', location: 'head', id: '0004' },
      { path: 'head/0005', location: 'head', id: '0005' },
    ] as cordovaAnalysisFile[],
    libs: [
      { name: 'bluebird', shouldBeVersion: '3.4.6', shouldBeInFile: 'head/0000' },
      { name: 'ionic', shouldBeVersion: '1.3.1', shouldBeInFile: 'head/0001' },
      { name: 'angular', shouldBeVersion: '1.5.3', shouldBeInFile: 'head/0001' },
      { name: 'angular-animate', shouldBeVersion: '1.5.3', shouldBeInFile: 'head/0001' },
      { name: 'angular-sanitize', shouldBeVersion: '1.5.3', shouldBeInFile: 'head/0001' },
      { name: 'angular-ui-router', shouldBeVersion: '0.2.13', shouldBeInFile: 'head/0001' },
      { name: 'ionic-angular', shouldBeVersion: '1.3.1', shouldBeInFile: 'head/0001' },
      { name: 'ngCordova', shouldBeVersion: '0.1.27-alpha', shouldBeInFile: 'head/0002' },
      { name: 'moment', shouldBeVersion: '2.17.1', shouldBeInFile: 'head/0003' },
      { name: 'angular-moment', shouldBeInFile: 'head/0004' },
      { name: 'moment-locale', shouldBeInFile: 'head/0005' },
      { name: 'react', shouldBeInFile: 'none' },
      { name: 'ramda', shouldBeInFile: 'none' },
      { name: 'async', shouldBeInFile: 'none' },
      { name: 'glob', shouldBeInFile: 'none' },
      { name: 'uuid', shouldBeInFile: 'none' },
    ],
  },
  {
    methods: ['fn-st-toks-v5'],
    app: {
      type: APP_TYPES.cordova,
      section: '20170726-com.aq_com.az',
      app: 'com.atv.freeanemia-1-2015_04_06.apk',
    },
    files: [
      { path: 'body/0002', location: 'body', id: '0002' },
      { path: 'body/0003', location: 'body', id: '0003' },
      { path: 'body/0004', location: 'body', id: '0004' },
      { path: 'body/0007', location: 'body', id: '0007' },
      { path: 'body/0008', location: 'body', id: '0008' },
      { path: 'body/0009', location: 'body', id: '0009' },
    ] as cordovaAnalysisFile[],
    libs: [
      { name: 'jquery', shouldBeVersion: '1.11.1', shouldBeInFile: 'body/0002' },
      { name: 'jquery-mobile', shouldBeVersion: '1.4.4', shouldBeInFile: 'body/0003' },
      { name: 'jQuery-Mobile-DateBox', shouldBeVersion: '1.4.4', shouldBeInFile: 'body/0004' },
      { name: 'tweenmax', shouldBeVersion: '1.15.0', shouldBeInFile: 'body/0008' },
      { name: 'timelinemax', shouldBeVersion: '1.15.0', shouldBeInFile: 'body/0009' },
      { name: 'react', shouldBeInFile: 'none' },
      { name: 'ramda', shouldBeInFile: 'none' },
      { name: 'async', shouldBeInFile: 'none' },
      { name: 'glob', shouldBeInFile: 'none' },
      { name: 'uuid', shouldBeInFile: 'none' },
    ],
  },
  {
    methods: ['fn-st-toks-v5'],
    app: {
      type: APP_TYPES.cordova,
      section: '20170726-com.p',
      app: 'com.paynopain.easyGOband-18-2017_04_04.apk',
    },
    files: [
      { path: 'head/0001', location: 'head', id: '0001' },
      { path: 'head/0002', location: 'head', id: '0002' },
      { path: 'head/0003', location: 'head', id: '0003' },
      { path: 'head/0004', location: 'head', id: '0004' },
      { path: 'head/0005', location: 'head', id: '0005' },
      { path: 'head/0006', location: 'head', id: '0006' },
      { path: 'head/0007', location: 'head', id: '0007' },
      { path: 'head/0008', location: 'head', id: '0008' },
      { path: 'head/0009', location: 'head', id: '0009' },
      { path: 'head/0010', location: 'head', id: '0010' },
      { path: 'head/0011', location: 'head', id: '0011' },
    ] as cordovaAnalysisFile[],
    libs: [
      { name: 'ionic', shouldBeVersion: '1.2.4-nightly-1917', shouldBeInFile: 'head/0001' },
      { name: 'angular', shouldBeVersion: '1.4.3', shouldBeInFile: 'head/0001' },
      { name: 'angular-animate', shouldBeVersion: '1.4.3', shouldBeInFile: 'head/0001' },
      { name: 'angular-sanitize', shouldBeVersion: '1.4.3', shouldBeInFile: 'head/0001' },
      { name: 'angular-ui-router', shouldBeVersion: '0.2.13', shouldBeInFile: 'head/0001' },
      { name: 'ionic-angular', shouldBeVersion: '1.2.4-nightly-1917', shouldBeInFile: 'head/0001' },
      { name: 'ngCordova', shouldBeVersion: '0.1.27-alpha', shouldBeInFile: 'head/0002' },
      { name: 'jquery', shouldBeVersion: '2.1.4', shouldBeInFile: 'head/0003' },
      { name: 'angular-local-storage', shouldBeVersion: '0.2.6', shouldBeInFile: 'head/0004' },
      { name: 'angular-validation', shouldBeInFile: ['head/0005', 'head/0006'] },
      { name: 'moment', shouldBeVersion: '2.9.0', shouldBeInFile: 'head/0007' },
      { name: 'HumanizeDuration', shouldBeInFile: 'head/0008' },
      { name: 'angular-timer', shouldBeVersion: '1.3.4', shouldBeInFile: 'head/0009' },
      { name: 'wheelzoom', shouldBeVersion: '3.0.4', shouldBeInFile: 'head/0010' },
      { name: 'angular-translate', shouldBeVersion: '2.13.0', shouldBeInFile: 'head/0011' },
      { name: 'react', shouldBeInFile: 'none' },
      { name: 'ramda', shouldBeInFile: 'none' },
      { name: 'async', shouldBeInFile: 'none' },
      { name: 'glob', shouldBeInFile: 'none' },
      { name: 'uuid', shouldBeInFile: 'none' },
    ],
  },
  {
    methods: ['fn-st-toks-v5'],
    app: {
      type: APP_TYPES.cordova,
      section: '20170726-com.t',
      app: 'com.tiny.m91392d54e89b48a6b2ecf1306f88ebbb-300000016-2017_02_17.apk',
    },
    files: [
      { path: 'body/0000', location: 'body', id: '0000' },
      { path: 'head/0004', location: 'head', id: '0004' },
    ] as cordovaAnalysisFile[],
    libs: [
      { name: 'angular', shouldBeVersion: '1.4.3', shouldBeInFile: 'body/0000' },
      { name: 'underscore', shouldBeVersion: '1.7.0', shouldBeInFile: 'body/0000' },
      { name: 'lodash', shouldBeVersion: '2.4.2', shouldBeInFile: 'body/0000' },
      { name: 'ng-animate', shouldBeVersion: '1.4.3', shouldBeInFile: 'body/0000' },
      { name: 'ng-sanitize', shouldBeVersion: '1.4.3', shouldBeInFile: 'body/0000' },
      { name: 'angular-ui-router', shouldBeVersion: '0.2.13', shouldBeInFile: 'body/0000' },
      { name: 'localForage', shouldBeVersion: '1.2.0', shouldBeInFile: 'body/0000' },
      { name: 'angular-translate', shouldBeVersion: '2.6.1', shouldBeInFile: 'body/0000' },
      { name: 'jssha', shouldBeInFile: 'body/0000' },
      { name: 'immutable', shouldBeInFile: 'body/0000' },
      { name: 'jquery', shouldBeVersion: '2.2.2', shouldBeInFile: 'body/0000' },
      { name: 'imgcache.js', shouldBeVersion: '1.0.0', shouldBeInFile: 'body/0000' },
      { name: 'ng-youtube-embed', shouldBeInFile: 'body/0000' },
      { name: 'add to homescreen', shouldBeVersion: '3.2.2', shouldBeInFile: 'body/0000' },
      { name: 'pdfjs', shouldBeVersion: '1.1.337', shouldBeInFile: 'body/0000' },
      { name: 'ngprogress', shouldBeVersion: '1.1.2', shouldBeInFile: 'body/0000' },
      { name: 'angular-google-maps', shouldBeVersion: '2.0.12', shouldBeInFile: 'body/0000' },
      { name: 'ionic', shouldBeVersion: '1.1.0', shouldBeInFile: 'body/0000' },
      { name: 'angular-ionic', shouldBeVersion: '1.1.0', shouldBeInFile: 'body/0000' },
      { name: 'angular-localforage', shouldBeVersion: '1.2.2', shouldBeInFile: 'body/0000' },
      { name: 'jQuery Waypoints', shouldBeVersion: '2.0.5', shouldBeInFile: 'body/0000' },
      { name: 'angular-pdf', shouldBeVersion: '1.0.2', shouldBeInFile: 'body/0000' },
      { name: 'Angulartics', shouldBeVersion: '0.17.2', shouldBeInFile: 'body/0000' },
      { name: 'jstz', shouldBeVersion: '1.0.4', shouldBeInFile: 'head/0004' },
      { name: 'react', shouldBeInFile: 'none' },
      { name: 'ramda', shouldBeInFile: 'none' },
      { name: 'async', shouldBeInFile: 'none' },
      { name: 'glob', shouldBeInFile: 'none' },
      { name: 'uuid', shouldBeInFile: 'none' },
    ],
  },
  {
    methods: ['fn-st-toks-v5'],
    app: {
      type: APP_TYPES.cordova,
      section: '20170726-com.t',
      app: 'com.tomatopie.stickermix8-10-2015_03_12.apk',
    },
    files: [
      { path: 'head/0001', location: 'head', id: '0001' },
      { path: 'head/0002', location: 'head', id: '0002' },
      { path: 'head/0003', location: 'head', id: '0003' },
      { path: 'head/0004', location: 'head', id: '0004' },
      { path: 'head/0005', location: 'head', id: '0005' },
      { path: 'head/0006', location: 'head', id: '0006' },
    ] as cordovaAnalysisFile[],
    libs: [
      { name: 'com.admob.AdmobPlugin.AdmobAd', shouldBeInFile: 'head/0001' },
      { name: 'nl.x-services.plugins.socialsharing.SocialSharing', shouldBeInFile: 'head/0002' },
      { name: 'jquery', shouldBeVersion: '1.11.2', shouldBeInFile: 'head/0003' },
      { name: 'bootstrap', shouldBeVersion: '3.3.2', shouldBeInFile: 'head/0004' },
      { name: 'velocity', shouldBeVersion: '1.2.2', shouldBeInFile: 'head/0005' },
      { name: 'velocity-jquery-shim', shouldBeVersion: '1.0.1', shouldBeInFile: 'head/0005' },
      { name: 'velocity ui pack', shouldBeVersion: '5.0.4', shouldBeInFile: 'head/0006' },
      { name: 'react', shouldBeInFile: 'none' },
      { name: 'ramda', shouldBeInFile: 'none' },
      { name: 'async', shouldBeInFile: 'none' },
      { name: 'glob', shouldBeInFile: 'none' },
      { name: 'uuid', shouldBeInFile: 'none' },
    ],
  },
  {
    methods: ['fn-st-toks-v5'],
    app: {
      type: APP_TYPES.cordova,
      section: '20170726-com.x',
      app: 'com.zousan.santahelp-78-2016_12_13.apk',
    },
    files: [{ path: 'head/0000', location: 'head', id: '0000' }] as cordovaAnalysisFile[],
    libs: [
      { name: 'monaca-cordova-loader', shouldBeInFile: 'head/0000' },
      { name: 'monaca-core-utils', shouldBeInFile: 'head/0000' },
      { name: 'react', shouldBeInFile: 'none' },
      { name: 'ramda', shouldBeInFile: 'none' },
      { name: 'async', shouldBeInFile: 'none' },
      { name: 'glob', shouldBeInFile: 'none' },
      { name: 'uuid', shouldBeInFile: 'none' },
    ],
  },
  {
    methods: ['fn-st-toks-v5'],
    app: {
      type: APP_TYPES.cordova,
      section: '20170726-d-z',
      app: 'io.shirkan.RavKav-1800000-2017_01_29.apk',
    },
    files: [
      { path: 'head/0000', location: 'head', id: '0000' },
      { path: 'head/0001', location: 'head', id: '0001' },
      { path: 'head/0002', location: 'head', id: '0002' },
      { path: 'head/0003', location: 'head', id: '0003' },
      { path: 'head/0005', location: 'head', id: '0005' },
      { path: 'head/0006', location: 'head', id: '0006' },
      { path: 'head/0007', location: 'head', id: '0007' },
    ] as cordovaAnalysisFile[],
    libs: [
      { name: 'jquery', shouldBeVersion: '2.1.1', shouldBeInFile: 'head/0000' },
      { name: 'floating', shouldBeVersion: '1.12', shouldBeInFile: 'head/0001' },
      { name: 'jquery-mobile', shouldBeVersion: '1.4.4', shouldBeInFile: 'head/0002' },
      { name: 'jquery-ui', shouldBeVersion: '1.11.1', shouldBeInFile: 'head/0003' },
      { name: 'Utilities js by Liran Cohen', shouldBeInFile: 'head/0005' },
      { name: 'Phonegap utilities js by Liran Cohen', shouldBeInFile: 'head/0006' },
      { name: 'Admob utilities js by Liran Cohen', shouldBeInFile: 'head/0007' },
      { name: 'react', shouldBeInFile: 'none' },
      { name: 'ramda', shouldBeInFile: 'none' },
      { name: 'async', shouldBeInFile: 'none' },
      { name: 'glob', shouldBeInFile: 'none' },
      { name: 'uuid', shouldBeInFile: 'none' },
    ],
  },
  {
    methods: ['fn-st-toks-v5'],
    app: {
      type: APP_TYPES.cordova,
      section: '20170726-d-z',
      app: 'net.jp.apps.noboruhirohara.yakei-102008-2016_05_02.apk',
    },
    files: [{ path: 'head/0000', location: 'head', id: '0000' }] as cordovaAnalysisFile[],
    libs: [
      { name: 'monaca-cordova-loader', shouldBeInFile: 'head/0000' },
      { name: 'monaca-core-utils', shouldBeInFile: 'head/0000' },
      { name: 'jquery', shouldBeVersion: '1.9.0', shouldBeInFile: 'head/0000' },
      { name: 'jquery-mobile', shouldBeVersion: '1.3.1', shouldBeInFile: 'head/0000' },
      { name: 'onsenui', shouldBeVersion: '1.3.8', shouldBeInFile: 'head/0000' },
      { name: 'react', shouldBeInFile: 'none' },
      { name: 'ramda', shouldBeInFile: 'none' },
      { name: 'async', shouldBeInFile: 'none' },
      { name: 'glob', shouldBeInFile: 'none' },
      { name: 'uuid', shouldBeInFile: 'none' },
    ],
  },

  {
    methods: ['fn-st-toks-v5'],
    app: {
      type: APP_TYPES.cordova,
      section: 'random',
      app: 'Snowbuddy-1.2.8.apk',
    },
    files: [{ path: 'head/0000', location: 'head', id: '0000' }] as cordovaAnalysisFile[],
    libs: [
      { name: 'jquery', shouldBeVersion: '2.1.1', shouldBeInFile: 'head/0000' },
      { name: 'react', shouldBeInFile: 'none' },
      { name: 'ramda', shouldBeInFile: 'none' },
      { name: 'async', shouldBeInFile: 'none' },
      { name: 'glob', shouldBeInFile: 'none' },
      { name: 'uuid', shouldBeInFile: 'none' },
    ],
  },
]
