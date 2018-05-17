import { find, map, sortBy } from 'lodash'
import { libNameVersion } from './parseLibraries'
import { stdoutLog } from './utils/logger'

const NAMESPACE = 'pkg.blacklist'
const log = stdoutLog(NAMESPACE)

export enum COMMENTS {
  oldArch = 'old archive format',
  extrTimestampFld = 'extracted into folder with timestamp',
  extrPkgNameFld = 'extracted into folder with pkg name',
  exportWrnFrm = 'exported main file is not javascript file',
  exportsBundleAsMain = 'exported main file is a bundled javascript file',
  tool = 'this module is a tool. it should not appear in the app',
  serverSide = 'this module is for server side. it should not appear in the app',
  testing = 'this module is for testing. it should not appear in the app',
  uncertain = 'uncertain whether it will appear in the app or not',
}

export type BlacklistEntry = {
  name: string
  versions:
    | 'none' // indicate that _no_ versions are blacklisted
    | ('*' | 'all') // indicate that _all_ versions are blacklisted
    | {
        v: string
        comment?: COMMENTS[]
      }[]
  comment?: COMMENTS[]
}

const blacklistUnsorted: BlacklistEntry[] = [
  {
    name: 'async',
    versions: [
      {
        v: '0.1.0',
        comment: [COMMENTS.oldArch, COMMENTS.extrTimestampFld],
      },
      {
        v: '0.1.1',
        comment: [COMMENTS.oldArch, COMMENTS.extrTimestampFld],
      },
      {
        v: '0.1.2',
        comment: [COMMENTS.oldArch, COMMENTS.extrTimestampFld],
      },
      {
        v: '0.1.3',
        comment: [COMMENTS.oldArch, COMMENTS.extrTimestampFld],
      },
      {
        v: '0.1.4',
        comment: [COMMENTS.oldArch, COMMENTS.extrTimestampFld],
      },
      {
        v: '0.1.5',
        comment: [COMMENTS.oldArch, COMMENTS.extrTimestampFld],
      },
      {
        v: '0.1.6',
        comment: [COMMENTS.oldArch, COMMENTS.extrTimestampFld],
      },
      {
        v: '0.1.7',
        comment: [COMMENTS.oldArch, COMMENTS.extrPkgNameFld],
      },
      {
        v: '0.1.8',
        comment: [COMMENTS.oldArch, COMMENTS.extrPkgNameFld],
      },
    ],
  },
  { name: 'aws-sdk', versions: 'all', comment: [COMMENTS.exportsBundleAsMain] },
  { name: 'axios', versions: 'none' },
  { name: 'babel-core', versions: 'all', comment: [COMMENTS.tool] },
  { name: 'babel-eslint', versions: 'all', comment: [COMMENTS.tool] },
  { name: 'babel-loader', versions: 'all', comment: [COMMENTS.tool] },
  { name: 'babel-polyfill', versions: 'none' },
  { name: 'babel-preset-es2015', versions: 'all', comment: [COMMENTS.tool] },
  { name: 'babel-preset-react', versions: 'all', comment: [COMMENTS.tool] },
  { name: 'babel-runtime', versions: 'all', comment: [COMMENTS.tool] },
  { name: 'bluebird', versions: 'none' },
  { name: 'body-parser', versions: 'all', comment: [COMMENTS.serverSide] },
  { name: 'bootstrap', versions: 'none' },
  { name: 'chai', versions: 'none', comment: [COMMENTS.testing] },
  { name: 'chalk', versions: 'none', comment: [COMMENTS.uncertain] },
  { name: 'cheerio', versions: 'all', comment: [COMMENTS.serverSide] },
  { name: 'chokidar', versions: 'all', comment: [COMMENTS.tool] },
  { name: 'classnames', versions: 'none' },
  { name: 'co', versions: 'none' },
  { name: 'coffee-script', versions: 'all', comment: [COMMENTS.tool] },
  {
    name: 'colors',
    versions: [
      {
        v: '0.3.0',
        comment: [COMMENTS.oldArch, COMMENTS.extrTimestampFld],
      },
    ],
  },
  { name: 'commander', versions: 'all', comment: [COMMENTS.serverSide] },
  { name: 'cookie-parser', versions: 'all', comment: [COMMENTS.serverSide] },
  { name: 'core-js', versions: 'none' },
  { name: 'css-loader', versions: 'all', comment: [COMMENTS.tool] },
  { name: 'debug', versions: 'none' },
  { name: 'ejs', versions: 'none', comment: [COMMENTS.uncertain] },
  { name: 'ember-cli-babel', versions: 'all', comment: [COMMENTS.tool] },
  { name: 'es6-promise', versions: 'none' },
  { name: 'eslint', versions: 'all', comment: [COMMENTS.tool] },
  { name: 'express', versions: 'all', comment: [COMMENTS.serverSide] },
  { name: 'extend', versions: 'none' },
  { name: 'file-loader', versions: 'all', comment: [COMMENTS.tool] },
  { name: 'fs-extra', versions: 'all', comment: [COMMENTS.serverSide] },
  { name: 'glob', versions: 'none', comment: [COMMENTS.serverSide] },
  { name: 'gulp', versions: 'all', comment: [COMMENTS.tool] },
  { name: 'gulp-util', versions: 'all', comment: [COMMENTS.tool] },
  { name: 'handlebars', versions: 'none', comment: [COMMENTS.uncertain] },
  { name: 'inquirer', versions: 'all', comment: [COMMENTS.serverSide] },
  { name: 'jade', versions: 'none' },
  { name: 'jquery', versions: 'none' },
  { name: 'js-yaml', versions: 'none' },
  { name: 'less', versions: 'none', comment: [COMMENTS.uncertain] },
  { name: 'marked', versions: 'none' },
  { name: 'meow', versions: 'all', comment: [COMMENTS.serverSide] },
  { name: 'mime', versions: 'none' },
  { name: 'minimatch', versions: 'none', comment: [COMMENTS.uncertain] },
  { name: 'minimist', versions: 'all', comment: [COMMENTS.serverSide] },
  { name: 'mkdirp', versions: 'all', comment: [COMMENTS.serverSide] },
  { name: 'mocha', versions: 'all', comment: [COMMENTS.testing] },
  { name: 'moment', versions: 'none' },
  { name: 'mongodb', versions: 'all', comment: [COMMENTS.serverSide] },
  { name: 'mongoose', versions: 'all', comment: [COMMENTS.serverSide] },
  { name: 'morgan', versions: 'all', comment: [COMMENTS.serverSide] },
  { name: 'node-uuid', versions: 'none', comment: [COMMENTS.uncertain] },
  { name: 'object-assign', versions: 'none' },
  { name: 'optimist', versions: 'all', comment: [COMMENTS.serverSide] },
  { name: 'path', versions: 'none', comment: [COMMENTS.uncertain] },
  { name: 'postcss', versions: 'all', comment: [COMMENTS.tool] },
  { name: 'promise', versions: 'none' },
  { name: 'prop-types', versions: 'none' },
  {
    name: 'q',
    versions: [
      {
        v: '0.0.1',
        comment: [COMMENTS.oldArch, COMMENTS.extrTimestampFld],
      },
      {
        v: '0.0.3',
        comment: [COMMENTS.oldArch, COMMENTS.extrTimestampFld],
      },
      {
        v: '0.1.6',
        comment: [COMMENTS.oldArch, COMMENTS.extrPkgNameFld],
      },
      {
        v: '0.0.0',
        comment: [COMMENTS.oldArch, COMMENTS.extrTimestampFld],
      },
      {
        v: '0.0.2',
        comment: [COMMENTS.oldArch, COMMENTS.extrTimestampFld],
      },
      {
        v: '0.1.0',
        comment: [COMMENTS.oldArch, COMMENTS.extrTimestampFld],
      },
      {
        v: '0.1.7',
        comment: [COMMENTS.oldArch, COMMENTS.extrPkgNameFld],
      },
      {
        v: '0.1.8',
        comment: [COMMENTS.oldArch, COMMENTS.extrPkgNameFld],
      },
      {
        v: '0.1.9',
        comment: [COMMENTS.oldArch, COMMENTS.extrPkgNameFld],
      },
      {
        v: '0.1.2',
        comment: [COMMENTS.oldArch, COMMENTS.extrTimestampFld],
      },
      {
        v: '0.1.3',
        comment: [COMMENTS.oldArch, COMMENTS.extrTimestampFld],
      },
      {
        v: '0.2.0-rc1',
        comment: [COMMENTS.oldArch, COMMENTS.extrPkgNameFld],
      },
      {
        v: '0.1.5',
        comment: [COMMENTS.oldArch, COMMENTS.extrTimestampFld],
      },
      {
        v: '0.2.1',
        comment: [COMMENTS.oldArch, COMMENTS.extrPkgNameFld],
      },
      {
        v: '0.2.0',
        comment: [COMMENTS.oldArch, COMMENTS.extrPkgNameFld],
      },
      {
        v: '0.2.2',
        comment: [COMMENTS.oldArch, COMMENTS.extrPkgNameFld],
      },
      {
        v: '0.2.3',
        comment: [COMMENTS.oldArch, COMMENTS.extrPkgNameFld],
      },
      {
        v: '0.2.4',
        comment: [COMMENTS.oldArch, COMMENTS.extrPkgNameFld],
      },
      {
        v: '0.2.7',
        comment: [COMMENTS.oldArch, COMMENTS.extrPkgNameFld],
      },
      {
        v: '0.1.1',
        comment: [COMMENTS.oldArch, COMMENTS.extrTimestampFld],
      },
      {
        v: '0.1.4',
        comment: [COMMENTS.oldArch, COMMENTS.extrTimestampFld],
      },
      {
        v: '0.2.5',
        comment: [COMMENTS.oldArch, COMMENTS.extrPkgNameFld],
      },
      {
        v: '0.2.6',
        comment: [COMMENTS.oldArch, COMMENTS.extrPkgNameFld],
      },
      {
        v: '0.2.8',
        comment: [COMMENTS.oldArch, COMMENTS.extrPkgNameFld],
      },
    ],
  },
  { name: 'ramda', versions: 'none' },
  { name: 'react', versions: 'none' },
  { name: 'react-dom', versions: 'none' },
  { name: 'react-redux', versions: 'none' },
  { name: 'redis', versions: 'all', comment: [COMMENTS.serverSide] },
  { name: 'redux', versions: 'none' },
  { name: 'request', versions: 'all', comment: [COMMENTS.serverSide] },
  { name: 'request-promise', versions: 'all', comment: [COMMENTS.serverSide] },
  { name: 'rimraf', versions: 'all', comment: [COMMENTS.serverSide] },
  { name: 'rxjs', versions: 'none' },
  { name: 'semver', versions: 'none', comment: [COMMENTS.uncertain] },
  { name: 'shelljs', versions: 'all', comment: [COMMENTS.serverSide] },
  { name: 'socket.io', versions: 'none' },
  { name: 'style-loader', versions: 'all', comment: [COMMENTS.tool] },
  { name: 'superagent', versions: 'none' },
  { name: 'through2', versions: 'none', comment: [COMMENTS.uncertain] },
  { name: 'uglify-js', versions: 'all', comment: [COMMENTS.tool] },
  { name: 'underscore', versions: 'none' },
  { name: 'underscore.string', versions: 'none' },
  { name: 'uuid', versions: 'none' },
  { name: 'vue', versions: 'none' },
  { name: 'webpack', versions: 'all', comment: [COMMENTS.tool] },
  { name: 'winston', versions: 'all', comment: [COMMENTS.serverSide, COMMENTS.uncertain] },
  { name: 'ws', versions: 'all', comment: [COMMENTS.serverSide] },
  { name: 'xml2js', versions: 'none', comment: [COMMENTS.uncertain] },
  { name: 'yargs', versions: 'all', comment: [COMMENTS.serverSide] },
  { name: 'yeoman-generator', versions: 'all', comment: [COMMENTS.tool] },
  { name: 'yosay', versions: 'all', comment: [COMMENTS.tool] },
  { name: 'zone.js', versions: 'none' },
]

const blacklist = sortBy(
  map(blacklistUnsorted, (e: BlacklistEntry) => {
    if (Array.isArray(e.versions)) {
      e.versions = sortBy(e.versions, ['v'])
    }
    return e
  }),
  ['name'],
)

export const isInBlacklist = ({ name, version: v }: libNameVersion): COMMENTS[] | boolean => {
  const lib = find(blacklist, { name })
  if (!lib || lib.versions === 'none') {
    return false
  }
  if (lib.versions === '*' || lib.versions === 'all') {
    return true
  }

  const version = find(lib.versions, { v })
  if (!version) {
    return false
  }
  return version.comment || []
}
