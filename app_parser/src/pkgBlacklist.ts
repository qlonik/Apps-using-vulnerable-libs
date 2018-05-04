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
    name: 'fs-extra',
    versions: [
      {
        v: '0.0.1',
        comment: [COMMENTS.exportWrnFrm],
      },
      {
        v: '0.0.11',
        comment: [COMMENTS.exportWrnFrm],
      },
      {
        v: '0.0.3',
        comment: [COMMENTS.exportWrnFrm],
      },
    ],
  },
  {
    name: 'colors',
    versions: [
      {
        v: '0.3.0',
        comment: [COMMENTS.oldArch, COMMENTS.extrTimestampFld],
      },
    ],
  },
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

export const blacklist = sortBy(
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
