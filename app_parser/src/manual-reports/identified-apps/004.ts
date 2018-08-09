import { stripIndent } from 'common-tags'
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
    'body/0005': {
      location: 'body',
      id: '0005',
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
    'body/0006': {
      location: 'body',
      id: '0006',
      type: 'single-lib',
      match: {
        name: 'cordova',
        isGuess: true,
        comments: 'version is unknown, but PLATFORM_VERSION_BUILD_LABEL = 5.1.1',
      },
    },
    'body/0007': {
      location: 'body',
      id: '0007',
      type: 'business-logic', // maybe
    },
    'body/0008': {
      location: 'body',
      id: '0008',
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

// eslint-disable-next-line no-unused-vars
const additionalData = {
  files: {
    'body/0005': {
      algReport: {
        comments: [
          'angular is top candidate, then jquery, then mocha. ' +
            'lodash and underscore do not appear at all',
          'top match: angular@1.4.2 == angular@1.4.3 - 13.15% (same % val - 1349/10256)',
          'next: jquery@1.12.0 == jquery@1.12.1 - 5.63% (same % val - 579/10288)',
        ],
      },
      lookingManually: {
        method: 'fn-st-toks-v2',
        comparingAgainst: {
          name: 'aws-sdk',
          version: '2.4.5',
          file: '0000.json',
          similarity: {
            val: 0.19314179796107506,
            num: 2084,
            den: 10790,
          },
        },
        mapping: [
          {
            mappingStr: '24->312      ({ val: 1,         num: 1, den: 1 })',
            appFn: {
              comment: stripIndent`
                index in the signature is not the function #%whatever% from the bundle.
                It is actually top function. Bundle is created by first looking at the top
                level functions and then going further in depth
              `,
              index: 24,
              functionSignature: {
                type: 'fn',
                name: '[anonymous]',
                fnStatementTypes: ['t_st:ThrowStatement'],
                fnStatementTokens: ['t_st:ThrowStatement'],
              },
              lineInBundle: 71389,
              source: stripIndent`
                function () { throw "jQuery is not available"; }
              `,
            },
            libFn: {
              index: 312,
              functionSignature: {
                type: 'fn',
                name: '[anonymous]:>>:_rand',
                fnStatementTypes: ['t_st:ThrowStatement'],
                fnStatementTokens: ['t_st:ThrowStatement'],
              },
              lineInBundle: 12914,
              source: stripIndent`
                Rand.prototype._rand = function() {
                  throw new Error('Not implemented yet');
                };
              `,
            },
          },
          {
            mappingStr: '115->1457    ({ val: 1,         num: 1, den: 1 })',
            appFn: {
              index: 115,
              functionSignature: {
                type: 'fn',
                name: '[anonymous]:>>:[anonymous]',
                fnStatementTypes: ['t_st:ReturnStatement'],
                fnStatementTokens: ['st:Return[ex:Object]'],
              },
            },
            libFn: {
              index: 1457,
              functionSignature: {
                type: 'fn',
                name: '[anonymous]:>>:[anonymous]:>>:toJSON',
                fnStatementTypes: ['t_st:ReturnStatement'],
                fnStatementTokens: ['st:Return[ex:Object]'],
              },
            },
          },

          {
            mappingStr: '573->930     ({ val: 1,         num: 8, den: 8 })',
            comment: stripIndent`
              Same function! it looks like that in library it is inserted by webpack. It is possible
              that in the app bundle, this function is also injected by some sort of polyfill.
              This function repeats its definition - from manually looking at it, found at least 6.
              Inside this function, there is another function defined - 'ctor'. Which repeats few
              times and automatically inserted by some build-tool/polyfill or smth like that.
            `,
            appFn: {
              index: 573,
              functionSignature: {
                type: 'fn',
                name: '[anonymous]:>>:[anonymous]:>>:__extends',
                fnStatementTypes: [
                  't_pr:Identifier',
                  't_pr:Identifier',
                  't_st:ExpressionStatement',
                  't_st:ExpressionStatement',
                  't_st:ExpressionStatement',
                  't_st:ForInStatement',
                  't_st:FunctionDeclaration',
                  't_st:ReturnStatement',
                ],
                fnStatementTokens: [
                  'de:Function[ex:Identifier[ctor]]',
                  'ex:Assignment[pr:Member[child.__super__] = ex:Member[parent.prototype]]',
                  'ex:Assignment[pr:Member[child.prototype] = t_ex:NewExpression]',
                  'ex:Assignment[pr:Member[ctor.prototype] = ex:Member[parent.prototype]]',
                  'pr:Identifier[child]',
                  'pr:Identifier[parent]',
                  'st:Return[ex:Identifier[child]]',
                  't_st:ForInStatement',
                ],
              },
              source: stripIndent`
                var __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; }
              `,
            },
            libFn: {
              index: 930,
              functionSignature: {
                type: 'fn',
                name: '[anonymous]:>>:[anonymous]:>>:extend',
                fnStatementTypes: [
                  't_pr:Identifier',
                  't_pr:Identifier',
                  't_st:ExpressionStatement',
                  't_st:ExpressionStatement',
                  't_st:ExpressionStatement',
                  't_st:ForInStatement',
                  't_st:FunctionDeclaration',
                  't_st:ReturnStatement',
                ],
                fnStatementTokens: [
                  'de:Function[ex:Identifier[ctor]]',
                  'ex:Assignment[pr:Member[child.__super__] = ex:Member[parent.prototype]]',
                  'ex:Assignment[pr:Member[child.prototype] = t_ex:NewExpression]',
                  'ex:Assignment[pr:Member[ctor.prototype] = ex:Member[parent.prototype]]',
                  'pr:Identifier[child]',
                  'pr:Identifier[parent]',
                  'st:Return[ex:Identifier[child]]',
                  't_st:ForInStatement',
                ],
              },
              source: stripIndent`
                var extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; }
              `,
            },
          },
          {
            mappingStr: '612->936     ({ val: 1,         num: 1, den: 1 })',
            appFn: {
              index: 612,
              functionSignature: {
                type: 'fn',
                name: '[anonymous]:>>:[anonymous]:>>:__extends:>>:ctor',
                fnStatementTypes: ['t_st:ExpressionStatement'],
                fnStatementTokens: [
                  'ex:Assignment[pr:Member[null.constructor] = ex:Identifier[child]]',
                ],
              },
            },
            libFn: {
              index: 936,
              functionSignature: {
                type: 'fn',
                name: '[anonymous]:>>:[anonymous]:>>:extend:>>:ctor',
                fnStatementTypes: ['t_st:ExpressionStatement'],
                fnStatementTokens: [
                  'ex:Assignment[pr:Member[null.constructor] = ex:Identifier[child]]',
                ],
              },
            },
          },

          {
            mappingStr: '6237->994    ({ val: 0.538462,  num: 7, den: 13 })',
            comment: stripIndent`
              In both app bundle and lib bundle, these functions have to do something with SHA1.
              In the app, this library has bunch of comments in chinese.
              In the lib, this library is not identified and appears twice.
            `,
            appFn: {
              index: 6237,
              functionSignature: {
                type: 'fn',
                name: '[anonymous]:>>:ft',
                fnStatementTypes: [
                  't_pr:Identifier',
                  't_pr:Identifier',
                  't_pr:Identifier',
                  't_pr:Identifier',
                  't_st:IfStatement',
                ],
                fnStatementTokens: [
                  'pr:Identifier[b]',
                  'pr:Identifier[c]',
                  'pr:Identifier[d]',
                  'pr:Identifier[t]',
                  'st:Else-If',
                  'st:Else-If',
                  'st:If',
                  'st:Return[ex:Binary[ex:Binary[ex:Binary[ex:Identifier[b] & ex:Identifier[c]] | ex:Binary[ex:Identifier[b] & ex:Identifier[d]]] | ex:Binary[ex:Identifier[c] & ex:Identifier[d]]]]',
                  'st:Return[ex:Binary[ex:Binary[ex:Identifier[b] & ex:Identifier[c]] | ex:Binary[t_ex:UnaryExpression & ex:Identifier[d]]]]',
                  'st:Return[ex:Binary[ex:Binary[ex:Identifier[b] ^ ex:Identifier[c]] ^ ex:Identifier[d]]]',
                  'st:Return[ex:Binary[ex:Binary[ex:Identifier[b] ^ ex:Identifier[c]] ^ ex:Identifier[d]]]',
                ],
              },
              lineInBundle: 70425,
              source: stripIndent`
                function ft(t, b, c, d){
                    if(t < 20){
                        return (b & c) | ((~b) & d);
                    }else if(t < 40){
                        return b ^ c ^ d;
                    }else if(t < 60){
                        return (b & c) | (b & d) | (c & d);
                    }else{
                        return b ^ c ^ d;
                    }
                }
              `,
            },
            libFn: {
              index: 994,
              functionSignature: {
                type: 'fn',
                name: '[anonymous]:>>:[anonymous]:>>:ft',
                fnStatementTypes: [
                  't_pr:Identifier',
                  't_pr:Identifier',
                  't_pr:Identifier',
                  't_pr:Identifier',
                  't_st:IfStatement',
                  't_st:IfStatement',
                  't_st:ReturnStatement',
                ],
                fnStatementTokens: [
                  'pr:Identifier[b]',
                  'pr:Identifier[c]',
                  'pr:Identifier[d]',
                  'pr:Identifier[s]',
                  'st:If',
                  'st:If',
                  'st:Return[ex:Binary[ex:Binary[ex:Binary[ex:Identifier[b] & ex:Identifier[c]] | ex:Binary[ex:Identifier[b] & ex:Identifier[d]]] | ex:Binary[ex:Identifier[c] & ex:Identifier[d]]]]',
                  'st:Return[ex:Binary[ex:Binary[ex:Identifier[b] & ex:Identifier[c]] | ex:Binary[t_ex:UnaryExpression & ex:Identifier[d]]]]',
                  'st:Return[ex:Binary[ex:Binary[ex:Identifier[b] ^ ex:Identifier[c]] ^ ex:Identifier[d]]]',
                ],
              },
              lineInBundle: [29466, 29371],
              source: stripIndent`
                function ft (s, b, c, d) {
                  if (s === 0) return (b & c) | ((~b) & d)
                  if (s === 2) return (b & c) | (b & d) | (c & d)
                  return b ^ c ^ d
                }
              `,
            },
          },
        ],
      },
    },
    'head/0004': {
      algReport: {
        comments: ['library is missing in dataset', 'missing in top1000'],
      },
    },
  },
}
