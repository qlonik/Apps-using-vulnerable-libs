import { APP_TYPES } from '../../parseApps'
import { CordovaManualAnalysisReport } from './index'

export const id = 'cordova/20170726-com.aq_com.az/com.atv.freeanemia-1-2015_04_06.apk'
export const report: CordovaManualAnalysisReport = {
  app: {
    type: APP_TYPES.cordova,
    section: '20170726-com.aq_com.az',
    app: 'com.atv.freeanemia-1-2015_04_06.apk',
  },
  files: {
    'body/0000': {
      location: 'body',
      id: '0000',
      type: 'single-lib',
      match: {
        name: 'cordova',
        isGuess: true,
        minified: false,
        comments: 'version is unknown, but PLATFORM_VERSION_BUILD_LABEL = 3.5.1',
      },
    },
    'body/0001': { location: 'body', id: '0001', type: 'business-logic' },
    'body/0002': {
      location: 'body',
      id: '0002',
      type: 'single-lib',
      match: {
        name: 'jquery',
        version: '1.11.1',
        file: '0001.json',
        isGuess: false,
        minified: true,
      },
    },
    'body/0003': {
      location: 'body',
      id: '0003',
      type: 'single-lib',
      match: {
        name: 'jquery-mobile',
        version: '1.4.4',
        isGuess: false,
        minified: false,
      },
    },
    'body/0004': {
      location: 'body',
      id: '0004',
      type: 'single-lib',
      match: {
        name: 'jQuery-Mobile-DateBox',
        version: '1.4.4',
        isGuess: true,
        minified: true,
      },
    },
    'body/0005': { location: 'body', id: '0005', type: 'business-logic' },
    'body/0006': { location: 'body', id: '0006', type: 'business-logic' },
    'body/0007': { location: 'body', id: '0007', type: 'business-logic' },
    'body/0008': {
      location: 'body',
      id: '0008',
      type: 'single-lib',
      match: {
        name: 'tweenmax',
        version: '1.15.0',
        isGuess: true,
        minified: true,
        comments:
          'contains comment: ' +
          '"Includes all of the following: TweenLite, TweenMax, TimelineLite, TimelineMax, ' +
          'EasePack, CSSPlugin, RoundPropsPlugin, BezierPlugin, AttrPlugin, ' +
          'DirectionalRotationPlugin"\n' +
          'references "http://www.greensock.com"',
      },
    },
    'body/0009': {
      location: 'body',
      id: '0009',
      type: 'single-lib',
      match: {
        name: 'timelinemax',
        version: '1.15.0',
        isGuess: true,
        minified: true,
        comments: 'references http://www.greensock.com',
      },
    },
  },
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const additionalData = {
  files: {
    'body/0002': {
      algReport: {
        comments: [
          'jquery is a single candidate (matched as subset)',
          'jquery@1.11.1 - 100% match',
          'jquery@1.11.1-rc2 - 99.6661%',
          'jquery@1.11.2 - 98.00995%',
        ],
      },
    },
    'body/0003': {
      algReport: {
        comments: ['library is missing in dataset', 'missing in top1000'],
      },
    },
    'body/0004': {
      algReport: {
        comments: ['library is missing in dataset', 'missing in top1000'],
      },
    },
    'body/0008': {
      algReport: {
        comments: ['library is missing in dataset', 'missing in top1000'],
      },
    },
    'body/0009': {
      algReport: {
        comments: ['library is missing in dataset', 'missing in top1000'],
      },
    },
  },
}
