import { map, sortBy } from 'lodash'


export enum COMMENTS {
  oldArch = 'old archive format',
  extrTimestampFld = 'extracted into folder with timestamp',
  extrPkgNameFld = 'extracted into folder with pkg name',
  exportWrnFrm = 'exported main file is not javascript file',
}

export type BlacklistEntry = {
  name: string,
  versions: '*' | {
    v: string,
    comment: string[],
  }[],
}
const blacklistUnsorted: BlacklistEntry[] = [{
  name: 'fs-extra',
  versions: [{
    v: '0.0.1',
    comment: [
      COMMENTS.exportWrnFrm,
    ],
  }, {
    v: '0.0.11',
    comment: [
      COMMENTS.exportWrnFrm,
    ],
  }, {
    v: '0.0.3',
    comment: [
      COMMENTS.exportWrnFrm,
    ],
  }],
}, {
  name: 'colors',
  versions: [{
    v: '0.3.0', comment: [
      COMMENTS.oldArch,
      COMMENTS.extrTimestampFld,
    ],
  }],
}, {
  name: 'q',
  versions: [{
    v: '0.0.1',
    comment: [
      COMMENTS.oldArch,
      COMMENTS.extrTimestampFld,
    ],
  }, {
    v: '0.0.3',
    comment: [
      COMMENTS.oldArch,
      COMMENTS.extrTimestampFld,
    ],
  }, {
    v: '0.1.6',
    comment: [
      COMMENTS.oldArch,
      COMMENTS.extrPkgNameFld,
    ],
  }, {
    v: '0.0.0',
    comment: [
      COMMENTS.oldArch,
      COMMENTS.extrTimestampFld,
    ],
  }, {
    v: '0.0.2',
    comment: [
      COMMENTS.oldArch,
      COMMENTS.extrTimestampFld,
    ],
  }, {
    v: '0.1.0',
    comment: [
      COMMENTS.oldArch,
      COMMENTS.extrTimestampFld,
    ],
  }, {
    v: '0.1.7',
    comment: [
      COMMENTS.oldArch,
      COMMENTS.extrPkgNameFld,
    ],
  }, {
    v: '0.1.8',
    comment: [
      COMMENTS.oldArch,
      COMMENTS.extrPkgNameFld,
    ],
  }, {
    v: '0.1.9',
    comment: [
      COMMENTS.oldArch,
      COMMENTS.extrPkgNameFld,
    ],
  }, {
    v: '0.1.2',
    comment: [
      COMMENTS.oldArch,
      COMMENTS.extrTimestampFld,
    ],
  }, {
    v: '0.1.3',
    comment: [
      COMMENTS.oldArch,
      COMMENTS.extrTimestampFld,
    ],
  }, {
    v: '0.2.0-rc1',
    comment: [
      COMMENTS.oldArch,
      COMMENTS.extrPkgNameFld,
    ],
  }, {
    v: '0.1.5',
    comment: [
      COMMENTS.oldArch,
      COMMENTS.extrTimestampFld,
    ],
  }, {
    v: '0.2.1',
    comment: [
      COMMENTS.oldArch,
      COMMENTS.extrPkgNameFld,
    ],
  }, {
    v: '0.2.0',
    comment: [
      COMMENTS.oldArch,
      COMMENTS.extrPkgNameFld,
    ],
  }, {
    v: '0.2.2',
    comment: [
      COMMENTS.oldArch,
      COMMENTS.extrPkgNameFld,
    ],
  }, {
    v: '0.2.3',
    comment: [
      COMMENTS.oldArch,
      COMMENTS.extrPkgNameFld,
    ],
  }, {
    v: '0.2.4',
    comment: [
      COMMENTS.oldArch,
      COMMENTS.extrPkgNameFld,
    ],
  }, {
    v: '0.2.7',
    comment: [
      COMMENTS.oldArch,
      COMMENTS.extrPkgNameFld,
    ],
  }, {
    v: '0.1.1',
    comment: [
      COMMENTS.oldArch,
      COMMENTS.extrTimestampFld,
    ],
  }, {
    v: '0.1.4',
    comment: [
      COMMENTS.oldArch,
      COMMENTS.extrTimestampFld,
    ],
  }, {
    v: '0.2.5',
    comment: [
      COMMENTS.oldArch,
      COMMENTS.extrPkgNameFld,
    ],
  }, {
    v: '0.2.6',
    comment: [
      COMMENTS.oldArch,
      COMMENTS.extrPkgNameFld,
    ],
  }, {
    v: '0.2.8',
    comment: [
      COMMENTS.oldArch,
      COMMENTS.extrPkgNameFld,
    ],
  }],
}, {
  name: 'babel-runtime',
  versions: '*',
}]

export const blacklist = sortBy(
  map(blacklistUnsorted, (e: BlacklistEntry) => {
    if (e.versions !== '*') {
      e.versions = sortBy(e.versions, ['v'])
    }
    return e
  }), ['name'])
