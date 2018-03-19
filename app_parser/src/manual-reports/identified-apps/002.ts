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
      location: 'head',
      id: '0000',
      type: 'single-lib',
      match: {
        name: 'cordova',
        isGuess: true,
        comments: 'version is unknown, but PLATFORM_VERSION_BUILD_LABEL = 3.5.1',
      },
    },
    'body/0001': {
      location: 'head',
      id: '0001',
      type: 'business-logic',
    },
    'body/0002': {
      location: 'body',
      id: '0002',
      type: 'single-lib',
      match: {
        name: 'jquery',
        version: '1.11.1',
        file: '0001.json',
        isGuess: false,
      },
    },
    'body/0003': {
      location: 'body',
      id: '0003',
      type: 'unknown',
      match: {
        name: 'jquery-mobile',
        version: '1.4.4',
        isGuess: false,
        comments: 'non-minified',
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
        comments: 'minified',
      },
    },
    'body/0005': {
      location: 'body',
      id: '0005',
      type: 'business-logic',
    },
    'body/0006': {
      location: 'body',
      id: '0006',
      type: 'business-logic',
    },
    'body/0007': {
      location: 'body',
      id: '0007',
      type: 'unknown',
    },
    'body/0008': {
      location: 'body',
      id: '0008',
      type: 'single-lib',
      match: {
        name: 'tweenmax',
        version: '1.15.0',
        isGuess: true,
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
        comments: 'references http://www.greensock.com',
      },
    },
  },
}
