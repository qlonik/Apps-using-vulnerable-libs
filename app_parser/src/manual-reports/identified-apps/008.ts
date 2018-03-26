import { APP_TYPES } from '../../parseApps'
import { CordovaManualAnalysisReport } from './index'

export const id = 'cordova/20170726-d-z/net.jp.apps.noboruhirohara.yakei-102008-2016_05_02.apk'
export const report: CordovaManualAnalysisReport = {
  app: {
    type: APP_TYPES.cordova,
    section: '20170726-d-z',
    app: 'net.jp.apps.noboruhirohara.yakei-102008-2016_05_02.apk',
  },
  files: {
    'body/0000': { location: 'body', id: '0000', type: 'business-logic' },
    'body/0001': { location: 'body', id: '0001', type: 'http-script' },
    'head/0000': {
      location: 'head',
      id: '0000',
      type: 'bundle',
      match: [
        { name: 'monaca-cordova-loader', isGuess: true },
        { name: 'monaca-core-utils', isGuess: true },
        {
          name: 'jquery',
          version: '1.9.0',
          isGuess: false,
          comments: 'non-minified\n' + 'includes sizzle.js\n' + 'included as "monaca-jquery"',
        },
        {
          name: 'jquery-mobile',
          version: '1.3.1',
          isGuess: false,
          comments: 'non-minified\n' + 'included as "monaca-jquery-mobile"',
        },
        {
          name: 'onsenui',
          version: '1.3.8',
          isGuess: true,
          comments: 'minified\n' + 'included as "monaca-onsenui"',
        },
      ],
      comments: 'generated by framework bundler. framework called "Monaca"',
    },
    'head/0001': { location: 'head', id: '0001', type: 'business-logic' },
    'head/0002': { location: 'head', id: '0002', type: 'business-logic' },
    'head/0003': { location: 'head', id: '0003', type: 'business-logic' },
    'head/0004': { location: 'head', id: '0004', type: 'business-logic' },
    'head/0005': { location: 'head', id: '0005', type: 'business-logic' },
    'head/0006': { location: 'head', id: '0006', type: 'business-logic' },
  },
}
