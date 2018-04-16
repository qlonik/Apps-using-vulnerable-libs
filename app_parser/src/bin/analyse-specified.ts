import { flatMap, once, flatten } from 'lodash'
import { join } from 'path'
import { The } from 'typical-mini'
import { MessagesMap, pool as poolFactory } from 'workerpool'
import { analysisFile, APP_TYPES, appDesc, cordovaAnalysisFile } from '../parseApps'
import {
  getLibNameVersionSigFiles,
  libName, // eslint-disable-line no-unused-vars
  libNameVersion, // eslint-disable-line no-unused-vars
  libNameVersionSigFile,
} from '../parseLibraries'
import { resolveAllOrInParallel } from '../utils'
import { myWriteJSON } from '../utils/files'
import { stdoutLog } from '../utils/logger'
import { getWorkerPath } from '../utils/worker'

export enum METHODS_ENUM {
  'lit-vals',
  'fn-st-toks-v1',
  'fn-st-toks-v2',
  'fn-st-toks-v3',
  'fn-st-types',
  'fn-names',
  'fn-names-st-toks',
}
export type METHODS_TYPE = keyof typeof METHODS_ENUM
const METHODS = Object.values(METHODS_ENUM).filter((n) => typeof n === 'string') as METHODS_TYPE[]

export type descriptor = {
  app: appDesc
  file: analysisFile
  lib: libNameVersionSigFile
}
export type analysisMethods = Record<
  METHODS_TYPE,
  [
    [
      {
        apps: string
        libs: string
        save: string
        forceRedo?: boolean
      } & descriptor
    ],
    boolean
  ]
>
export type messages = The<MessagesMap, analysisMethods>

const APP_PATH = '../data/sample_apps'
const LIB_PATH = '../data/sample_libs'
const ANALYSIS_PATH = '../data/rnd-10'
const RESULTS_FILE = join(ANALYSIS_PATH, '_results.json')

type toAnalyseType = {
  app: descriptor['app']
  files: descriptor['file'][]
  libs: ('*' | libName | libNameVersion | descriptor['lib'])[]
}
const TO_ANALYSE: toAnalyseType[] = [
  {
    app: {
      type: APP_TYPES.cordova,
      section: '20170726-a_b',
      app: 'apps.yclients88759-10300-2017_04_13.apk',
    },
    files: [{ path: 'body/0000', location: 'body', id: '0000' }] as cordovaAnalysisFile[],
    libs: [
      { name: 'angular', version: '1.5.7', file: '0000' },
      { name: 'angular', version: '1.5.7', file: '0001' },
      { name: 'angular', version: '1.6.5', file: '0000' },
      { name: 'angular', version: '1.6.5', file: '0001' },
    ],
  },
  {
    app: {
      type: APP_TYPES.cordova,
      section: '20170726-com.t',
      app: 'com.tiny.m91392d54e89b48a6b2ecf1306f88ebbb-300000016-2017_02_17.apk',
    },
    files: [{ path: 'body/0000', location: 'body', id: '0000' }] as cordovaAnalysisFile[],
    libs: ['*'],
  },
]

const log = stdoutLog('analyse-specified')
log.enabled = true
let terminating = false

export const main = async () => {
  const pool = poolFactory<messages>(await getWorkerPath(__filename), { minWorkers: 0 })
  log('pool: min=%o, max=%o, %o', pool.minWorkers, pool.maxWorkers, pool.stats())

  const toAnalyse = await TO_ANALYSE.reduce(
    async (acc, { app, files, libs }) => {
      const loadedLibs = flatten(
        await Promise.all(
          libs.map(async (lib) => {
            let loadedLibNameVersionSig

            if (lib === '*') {
              loadedLibNameVersionSig = await getLibNameVersionSigFiles(LIB_PATH)
            } else {
              const version = 'version' in lib ? lib.version : undefined
              const file = 'file' in lib ? `${lib.file}.json` : undefined
              loadedLibNameVersionSig = await getLibNameVersionSigFiles(
                LIB_PATH,
                lib.name,
                version,
                file,
              )
            }

            return loadedLibNameVersionSig
          }),
        ),
      )

      return (await acc).concat({ app, files, libs: loadedLibs })
    },
    Promise.resolve([] as {
      app: descriptor['app']
      files: descriptor['file'][]
      libs: descriptor['lib'][]
    }[]),
  )

  const analysisPromises = flatMap(toAnalyse, ({ app, files, libs }) => {
    return flatMap(files, (file) => {
      return flatMap(libs, (lib) => async (): Promise<
        { done: false | Record<METHODS_TYPE, boolean> } & descriptor
      > => {
        if (terminating) {
          return { done: false, app, file, lib }
        }
        const results = await Promise.all(
          METHODS.map(async (m) => ({
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

  log('started analysis')
  const results = await resolveAllOrInParallel(analysisPromises)
  if (terminating) {
    log('terminated analysis')
  } else {
    log('finished analysis')
  }

  await myWriteJSON({ file: RESULTS_FILE, content: results })

  await pool.terminate()
}

export const terminate = once(() => {
  log('started terminating')
  terminating = true
})
