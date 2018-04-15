import { flatMap, once } from 'lodash'
import { join } from 'path'
import { The } from 'typical-mini'
import { MessagesMap, pool as poolFactory } from 'workerpool'
import { analysisFile, APP_TYPES, appDesc, cordovaAnalysisFile } from '../parseApps'
import { libName, libNameVersion, libNameVersionSigFile } from '../parseLibraries'
import { resolveAllOrInParallel } from '../utils'
import { myWriteJSON } from '../utils/files'
import { stdoutLog } from '../utils/logger'
import { getWorkerPath } from '../utils/worker'

export type descriptor = {
  app: appDesc
  file: analysisFile
  lib: '*' | libName | libNameVersion | libNameVersionSigFile
}
export type analysisMethods = Record<
  | 'lit-vals'
  | 'fn-st-toks-v1'
  | 'fn-st-toks-v2'
  | 'fn-st-toks-v3'
  | 'fn-st-types'
  | 'fn-names'
  | 'fn-names-st-toks',
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
  libs: descriptor['lib'][]
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
  const wPath = await getWorkerPath(__filename)

  if (terminating) {
    return
  }

  const pool = poolFactory<messages>(wPath, { minWorkers: 0 })
  log('pool: min=%o, max=%o, %o', pool.minWorkers, pool.maxWorkers, pool.stats())

  const methods = (await pool.exec('methods')).filter(
    (m) => m !== 'methods' && m !== 'run',
  ) as (keyof analysisMethods)[]

  const analysisPromises = flatMap(TO_ANALYSE, ({ app, files, libs }) => {
    return flatMap(files, (file) => {
      return flatMap(libs, (lib) => async (): Promise<
        {
          done: false | Record<keyof analysisMethods, boolean>
        } & descriptor
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
        const done = results.reduce((acc, { m, r }) => ({ ...acc, [m]: r }), {} as {
          [S in keyof analysisMethods]: boolean
        })

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
