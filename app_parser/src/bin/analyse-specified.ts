import { flatMap, flatten, once } from 'lodash'
import uniq from 'lodash/fp/uniq'
import uniqBy from 'lodash/fp/uniqBy'
import { join } from 'path'
import { Omit, Simplify, The } from 'typical-mini'
import { MessagesMap } from 'workerpool'
import { analysisFile, APP_TYPES, appDesc, cordovaAnalysisFile } from '../parseApps'
import {
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

type toAnalyseType = {
  methods: '*' | METHODS_TYPE | METHODS_TYPE[]
  app: descriptor['app']
  files: descriptor['file'][]
  libs: ('*' | libName | libNameVersion | descriptor['lib'])[]
}
const TO_ANALYSE: toAnalyseType[] = [
  {
    methods: '*',
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
    methods: '*',
    app: {
      type: APP_TYPES.cordova,
      section: '20170726-com.t',
      app: 'com.tiny.m91392d54e89b48a6b2ecf1306f88ebbb-300000016-2017_02_17.apk',
    },
    files: [{ path: 'body/0000', location: 'body', id: '0000' }] as cordovaAnalysisFile[],
    libs: ['*'],
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
            let loadedLibNameVersionSig: libNameVersionSigFile[]

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

            for (let { name, version } of loadedLibNameVersionSig) {
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

  log.debug({ toAnalyse }, 'analysis goal')

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
