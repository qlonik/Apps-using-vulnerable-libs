import { flatMap, flatten, once } from 'lodash'
import uniq from 'lodash/fp/uniq'
import uniqBy from 'lodash/fp/uniqBy'
import { join } from 'path'
import { Omit, Simplify, The } from 'typical-mini'
import { MessagesMap } from 'workerpool'
import { analysisFile, appDesc } from '../parseApps'
import {
  getLibNameVersions,
  getLibNameVersionSigFiles,
  libName,
  libNameVersion,
  libNameVersionSigFile,
} from '../parseLibraries'
import {
  FN_MATCHING_METHODS,
  FN_MATCHING_METHODS_TYPE,
  LIT_MATCHING_METHODS,
  LIT_MATCHING_METHODS_TYPE,
} from '../similarityIndex/similarity-methods'
import { assertNever, resolveAllOrInParallel } from '../utils'
import { myWriteJSON } from '../utils/files'
import { getWorkerPath, poolFactory } from '../utils/worker'
import { allMessages, MainFn, TerminateFn, WORKER_FILENAME } from './_all.types'
import { TO_ANALYSE } from './_analyse-specified.config'

export type METHODS_TYPE = LIT_MATCHING_METHODS_TYPE | FN_MATCHING_METHODS_TYPE
const METHODS = ([] as METHODS_TYPE[]).concat(LIT_MATCHING_METHODS).concat(FN_MATCHING_METHODS)

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

const TO_ANALYSE_FILENAME = '_to_analyse.json'
const TO_ANALYSE_PREPARED_FILENAME = '_to_analyse_prepared.json'
const ANALYSIS_DIR_NAME = 'rnd-10'
const RESULTS_FILENAME = '_results.json'

let terminating = false

const uniqApp = uniqBy<appDesc>(({ type, section, app }) => `${type}@@@${section}@@@${app}`)
const uniqLibNameVersion = uniqBy<libNameVersion>(({ name, version }) => `${name}@@@${version}`)

export const environment = {
  APPS_PATH: {},
  LIBS_PATH: {},
}

export const main: MainFn<typeof environment> = async (
  log,
  { OUT, APPS_PATH: APP_PATH, LIBS_PATH: LIB_PATH },
) => {
  const TO_ANALYSE_FILE = join(OUT, TO_ANALYSE_FILENAME)
  const TO_ANALYSE_PREPARED_FILE = join(OUT, TO_ANALYSE_PREPARED_FILENAME)
  const ANALYSIS_PATH = join(OUT, ANALYSIS_DIR_NAME)
  const RESULTS_FILE = join(ANALYSIS_PATH, RESULTS_FILENAME)

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
          ? todoMethods === '*'
            ? [...METHODS]
            : [todoMethods]
          : Array.isArray(todoMethods)
          ? uniq(todoMethods)
          : assertNever(todoMethods)

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

export const terminate: TerminateFn = (log) =>
  once(() => {
    log.info('started terminating')
    terminating = true
  })
