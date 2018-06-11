import { flatMap, flatten, once } from 'lodash'
import uniq from 'lodash/fp/uniq'
import uniqBy from 'lodash/fp/uniqBy'
import { join } from 'path'
import { Omit, Simplify, The } from 'typical-mini'
import { MessagesMap } from 'workerpool'
import { analysisFile, APP_TYPES, appDesc, cordovaAnalysisFile } from '../parseApps'
import {
  getLibNameVersions,
  getLibNameVersionSigFiles,
  libName,
  libNameVersion,
  libNameVersionSigFile,
} from '../parseLibraries'
import { assertNever, resolveAllOrInParallel } from '../utils'
import { myWriteJSON } from '../utils/files'
import logger from '../utils/logger'
import { getWorkerPath, poolFactory } from '../utils/worker'
import { allMessages, WORKER_FILENAME } from './_all.types'

export enum METHODS_ENUM {
  'lit-vals',
  'fn-st-toks-v1',
  'fn-st-toks-v2',
  'fn-st-toks-v3',
  'fn-st-toks-v4',
  'fn-st-toks-v5',
  'fn-st-types',
  'fn-names',
  'fn-names-st-toks',
}
export type METHODS_TYPE = keyof typeof METHODS_ENUM
const METHODS = Object.values(METHODS_ENUM).filter((n) => typeof n === 'string') as METHODS_TYPE[]

export type locations = {
  apps: string
  libs: string
  save: string
}
export type opts = Partial<{
  forceRedo: boolean
}>
export type descriptor = {
  app: appDesc
  file: analysisFile
  lib: libNameVersionSigFile
}
export type aggregateDescriptor = Simplify<Omit<descriptor, 'lib'> & { libNames: libName[] }>
export type analysisMethods = Record<METHODS_TYPE, [[locations & opts & descriptor], boolean]>
export type messages = The<
  MessagesMap,
  analysisMethods & {
    aggregate: [[locations & opts & aggregateDescriptor], boolean]
  }
>

const APP_PATH = '../data/sample_apps'
const LIB_PATH = '../data/sample_libs'
const ANALYSIS_PATH = join(process.env.OUT!, 'rnd-10')
const RESULTS_FILE = join(ANALYSIS_PATH, '_results.json')
const TO_ANALYSE_FILE = join(process.env.OUT!, '_to_analyse.json')
const TO_ANALYSE_PREPARED_FILE = join(process.env.OUT!, '_to_analyse_prepared.json')

type toAnalyseType = {
  methods: '*' | METHODS_TYPE | METHODS_TYPE[]
  app: descriptor['app']
  files: descriptor['file'][]
  libs: (
    | '*'
    | ((libName | libNameVersion | descriptor['lib']) & {
        shouldBeVersion?: string
        shouldBeInFile?: string | string[]
      }))[]
}
const TO_ANALYSE: toAnalyseType[] = [
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

const log = logger.child({ name: 'analyse-specified' })
let terminating = false

const uniqApp = uniqBy<appDesc>(({ type, section, app }) => `${type}@@@${section}@@@${app}`)
const uniqLibNameVersion = uniqBy<libNameVersion>(({ name, version }) => `${name}@@@${version}`)

export const main = async () => {
  const pool = poolFactory<messages>(await getWorkerPath(__filename), { minWorkers: 0 })
  log.info({ stats: pool.stats() }, 'pool: min=%o, max=%o', pool.minWorkers, pool.maxWorkers)

  const raPool = poolFactory<allMessages>(join(__dirname, WORKER_FILENAME), { minWorkers: 0 })
  log.info(
    { stats: raPool.stats() },
    'reanalysis pool: min=%o, max=%o',
    raPool.minWorkers,
    raPool.maxWorkers,
  )

  const toAnalyse = await TO_ANALYSE.reduce(
    async (acc, { methods: todoMethods, app, files, libs }) => {
      const methods =
        typeof todoMethods === 'string'
          ? todoMethods === '*' ? [...METHODS] : [todoMethods]
          : Array.isArray(todoMethods) ? uniq(todoMethods) : assertNever(todoMethods)

      const aggregateLibsSet = new Set<string>()
      let libsPreprocessUniqArr = [] as libNameVersion[]

      const loadedLibs = flatten(
        await Promise.all(
          libs.map(async (lib) => {
            let loadedLibNameVersion: libNameVersion[]
            let loadedLibNameVersionSig: libNameVersionSigFile[]

            if (lib === '*') {
              loadedLibNameVersion = await getLibNameVersions(LIB_PATH)
              loadedLibNameVersionSig = await getLibNameVersionSigFiles(LIB_PATH)
            } else {
              const version = 'version' in lib ? lib.version : undefined
              const file = 'file' in lib ? `${lib.file}.json` : undefined
              loadedLibNameVersion = await getLibNameVersions(LIB_PATH, lib.name, version)
              loadedLibNameVersionSig = await getLibNameVersionSigFiles(
                LIB_PATH,
                lib.name,
                version,
                file,
              )
            }

            for (let { name, version } of loadedLibNameVersion) {
              aggregateLibsSet.add(name)
              libsPreprocessUniqArr.push({ name, version })
            }

            return loadedLibNameVersionSig
          }),
        ),
      )

      const aggregateLibs = [...aggregateLibsSet].map((name) => ({ name } as libName))

      const awaited = await acc
      return {
        preprocess: {
          apps: uniqApp(awaited.preprocess.apps.concat([app])),
          libs: uniqLibNameVersion(awaited.preprocess.libs.concat(libsPreprocessUniqArr)),
        },
        analyse: awaited.analyse.concat({ methods, app, files, libs: loadedLibs }),
        aggregate: awaited.aggregate.concat({ app, files, libs: aggregateLibs }),
      }
    },
    Promise.resolve({
      preprocess: {
        apps: [] as descriptor['app'][],
        libs: [] as libNameVersion[],
      },
      analyse: [] as {
        methods: METHODS_TYPE[]
        app: descriptor['app']
        files: descriptor['file'][]
        libs: descriptor['lib'][]
      }[],
      aggregate: [] as {
        app: descriptor['app']
        files: descriptor['file'][]
        libs: libName[]
      }[],
    }),
  )

  await Promise.all([
    myWriteJSON({ content: TO_ANALYSE, file: TO_ANALYSE_FILE }),
    myWriteJSON({ content: toAnalyse, file: TO_ANALYSE_PREPARED_FILE }),
  ])

  const preprocessLibsPromises = toAnalyse.preprocess.libs.map((lib) => async () => ({
    done: terminating ? false : await raPool.exec('reanalyse-lib', [{ libsPath: LIB_PATH, lib }]),
    lib,
  }))

  const preprocessAppsPromises = toAnalyse.preprocess.apps.map((app) => async () => ({
    done: terminating
      ? false
      : await raPool.exec('preprocess-app', [
          { allAppsPath: APP_PATH, allLibsPath: LIB_PATH, app },
        ]),
    app,
  }))

  const analysisPromises = flatMap(toAnalyse.analyse, ({ methods, app, files, libs }) => {
    return flatMap(files, (file) => {
      return libs.map((lib) => async (): Promise<
        { done: false | Record<METHODS_TYPE, boolean> } & descriptor
      > => {
        if (terminating) {
          return { done: false, app, file, lib }
        }
        const results = await Promise.all(
          methods.map(async (m) => ({
            m,
            r: await pool.exec(m, [
              {
                apps: APP_PATH,
                libs: LIB_PATH,
                save: ANALYSIS_PATH,
                app,
                file,
                lib,
              },
            ]),
          })),
        )
        const done = results.reduce((acc, { m, r }) => ({ ...acc, [m]: r }), {} as Record<
          METHODS_TYPE,
          boolean
        >)

        return { done, app, file, lib }
      })
    })
  })

  const aggregatePromises = flatMap(toAnalyse.aggregate, ({ app, files, libs }) => {
    return files.map((file) => async () => {
      if (terminating) {
        return { done: false, app, file, libs }
      }
      const done = await pool.exec('aggregate', [
        { apps: APP_PATH, libs: LIB_PATH, save: ANALYSIS_PATH, app, file, libNames: libs },
      ])

      return { done, app, file, libs }
    })
  })

  log.info('reanalysing libs')
  await resolveAllOrInParallel(preprocessLibsPromises)
  log.info('preprocessing apps')
  await resolveAllOrInParallel(preprocessAppsPromises)
  await raPool.terminate()

  log.info('started analysis')
  const results = await resolveAllOrInParallel(analysisPromises)
  log.info('started aggregation')
  const aggregated = await resolveAllOrInParallel(aggregatePromises)
  log.info(`${terminating ? 'terminated' : 'finished'} analysis+aggregation`)

  await myWriteJSON({ file: RESULTS_FILE, content: { results, aggregated } })

  await pool.terminate()
}

export const terminate = once(() => {
  log.info('started terminating')
  terminating = true
})
