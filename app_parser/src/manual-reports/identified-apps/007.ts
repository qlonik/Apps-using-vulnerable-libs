import { APP_TYPES } from '../../parseApps'
import { CordovaManualAnalysisReport } from './index'

export const id = 'cordova/20170726-d-z/io.shirkan.RavKav-1800000-2017_01_29.apk'
export const report: CordovaManualAnalysisReport = {
  app: {
    type: APP_TYPES.cordova,
    section: '20170726-d-z',
    app: 'io.shirkan.RavKav-1800000-2017_01_29.apk',
  },
  files: {
    'body/0009': { location: 'body', id: '0009', type: 'business-logic' },
    'head/0000': {
      location: 'head',
      id: '0000',
      type: 'single-lib',
      match: {
        name: 'jquery',
        version: '2.1.1',
        file: '0000',
        isGuess: false,
        comments: 'non-minified, file is guessed',
      },
      comments: 'includes sizzle.js',
    },
    'head/0001': {
      location: 'head',
      id: '0001',
      type: 'single-lib',
      match: {
        name: 'floating',
        version: '1.12',
        isGuess: true,
        comments: 'guessed name',
      },
    },
    'head/0002': {
      location: 'head',
      id: '0002',
      type: 'single-lib',
      match: {
        name: 'jquery-mobile',
        version: '1.4.4',
        isGuess: true,
        comments: 'minified',
      },
    },
    'head/0003': {
      location: 'head',
      id: '0003',
      type: 'single-lib',
      match: {
        name: 'jquery-ui',
        version: '1.11.1',
        isGuess: true,
        comments:
          'name is guessed.\n' +
          'Includes: core.js, widget.js, mouse.js, position.js, draggable.js, droppable.js, ' +
          'resizable.js, selectable.js, sortable.js, accordion.js, autocomplete.js, button.js, ' +
          'datepicker.js, dialog.js, menu.js, progressbar.js, selectmenu.js, slider.js, ' +
          'spinner.js, tabs.js, tooltip.js, effect.js, effect-blind.js, effect-bounce.js, ' +
          'effect-clip.js, effect-drop.js, effect-explode.js, effect-fade.js, effect-fold.js, ' +
          'effect-highlight.js, effect-puff.js, effect-pulsate.js, effect-scale.js, ' +
          'effect-shake.js, effect-size.js, effect-slide.js, effect-transfer.js',
      },
    },
    'head/0004': {
      location: 'head',
      id: '0004',
      type: 'single-lib',
      match: {
        name: 'cordova',
        version: '6.1.2',
        isGuess: true,
        comments: 'version is unknown, but PLATFORM_VERSION_BUILD_LABEL = 6.1.2',
      },
    },
    'head/0005': {
      location: 'head',
      id: '0005',
      type: 'single-lib',
      match: {
        name: 'Utilities js by Liran Cohen',
        isGuess: true,
        comments: 'name is wrong, it was a title in a comment',
      },
    },
    'head/0006': {
      location: 'head',
      id: '0006',
      type: 'single-lib',
      match: {
        name: 'Phonegap utilities js by Liran Cohen',
        isGuess: true,
        comments: 'name is wrong, it was a title in a comment',
      },
    },
    'head/0007': {
      location: 'head',
      id: '0007',
      type: 'single-lib',
      match: {
        name: 'Admob utilities js by Liran Cohen',
        isGuess: true,
        comments: 'name is wrong, it was a title in a comment',
      },
    },
    'head/0008': {
      location: 'head',
      id: '0008',
      type: 'business-logic',
      comments: 'probably business-logic',
    },
  },
}

// eslint-disable-next-line no-unused-vars
const additionalData = {
  files: {
    'head/0000': {
      algReport: {
        comments: [
          'jquery is only candidate, matched as subset',
          'jquery@2.1.0-beta3 == ' +
            'jquery@2.1.1 == ' +
            'jquery@2.1.1-beta1 == ' +
            'jquery@2.1.1-rc1 == ' +
            'jquery@2.1.1-rc2 - 100% (same % val 561/561)',
          'jquery@2.1.0 == jquery@2.1.0-rc1 - 99.82%',
        ],
      },
    },
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
        comments: ['library is missing in dataset', 'appears in top 1000'],
      },
    },
  },
}
