import { join } from 'path'
import { Logger } from 'pino'
import R from 'ramda'
import { Omit, Simplify, The } from 'typical-mini'
import { MessagesMap } from 'workerpool'
import { analysisFile, appDesc } from '../parseApps'
import {
  getLibNameVersionSigFiles,
  libName,
  libNameVersion,
  libNameVersionSigFile,
} from '../parseLibraries'
import { FN_MATCHING_METHODS, LIT_MATCHING_METHODS } from '../similarityIndex/similarity-methods'
import { assertNever, resolveAllOrInParallel } from '../utils'
import { myWriteJSON } from '../utils/files'
import { getWorkerPath, poolFactory } from '../utils/worker'
import { allMessages, MainFn, TerminateFn, WORKER_FILENAME } from './_all.types'
import { METHODS_TYPE, TO_ANALYSE, toAnalyseType } from './_analyse-specified.config'

type commonOpts = {
  APP_PATH: string
  LIB_PATH: string
  ANALYSIS_PATH: string
  forceRedo?: boolean
}

export type analysisDescriptor = { app: appDesc; file: analysisFile; lib: libNameVersionSigFile }
export type aggregateDescriptor = Simplify<Omit<analysisDescriptor, 'lib'> & { libs: libName[] }>

export type messages = The<
  MessagesMap,
  /** analysis methods */
  Record<METHODS_TYPE, [[commonOpts & analysisDescriptor], boolean]> & {
    /** aggregate function */
    aggregate: [[commonOpts & aggregateDescriptor], boolean]
  }
>

type _analysisDescriptors = Simplify<
  Omit<analysisDescriptor, 'file' | 'lib'> & {
    files: analysisDescriptor['file'][]
    libs: analysisDescriptor['lib'][]
    methods: METHODS_TYPE[]
  }
>
type _aggregateDescriptors = Simplify<
  Omit<aggregateDescriptor, 'file'> & {
    files: aggregateDescriptor['file'][]
  }
>
type Unbox<T extends any[]> = T extends (infer R)[] ? R : never

const TO_ANALYSE_FILENAME = '_to_analyse.json'
const TO_ANALYSE_PREPARED_FILENAME = '_to_analyse_prepared.json'
const ANALYSIS_DIR_NAME = 'rnd-10'
const RESULTS_FILENAME = '_results.json'

const appToString = ({ type, section, app }: appDesc) => `${type}@@@${section}@@@${app}`
const toStrN = ({ name }: libName) => `${name}`
const toStrNV = ({ name, version }: libNameVersion) => `${name}@@@${version}`
const toStrNVF = ({ name, version, file }: libNameVersionSigFile) =>
  `${name}@@@${version}@@@${file}`

const fromEntries = <K extends string, V extends any>(x: [K, V][]): Record<K, V> =>
  x.reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {} as Record<K, V>)

const initPool = async ({
  log,
  APP_PATH,
  LIB_PATH,
  ANALYSIS_PATH,
}: {
  log: Logger
  APP_PATH: string
  LIB_PATH: string
  ANALYSIS_PATH: string
}) => {
  const pool = poolFactory<messages>(await getWorkerPath(__filename), { minWorkers: 0 })
  log.info({ stats: pool.stats() }, 'pool: min=%o, max=%o', pool.minWorkers, pool.maxWorkers)

  const raPool = poolFactory<allMessages>(join(__dirname, WORKER_FILENAME), { minWorkers: 0 })
  log.info(
    { stats: raPool.stats() },
    'reanalysis pool: min=%o, max=%o',
    raPool.minWorkers,
    raPool.maxWorkers,
  )

  return {
    /** terminate reanalysis pool */
    rt: () => raPool.terminate(),
    /** terminate main pool */
    pt: () => pool.terminate(),
    /** reanalyse-lib */
    rl: (lib: libNameVersion) => raPool.exec('reanalyse-lib', [{ libsPath: LIB_PATH, lib }]),
    /** preprocess app */
    pa: (app: appDesc) =>
      raPool.exec('preprocess-app', [{ allAppsPath: APP_PATH, allLibsPath: LIB_PATH, app }]),
    /** method */
    me: (m: METHODS_TYPE, desc: analysisDescriptor) =>
      pool.exec(m, [{ APP_PATH, LIB_PATH, ANALYSIS_PATH, ...desc }]),
    /** aggregate */
    ag: ({ app, file, libs }: aggregateDescriptor) =>
      pool.exec('aggregate', [{ APP_PATH, LIB_PATH, ANALYSIS_PATH, app, file, libs }]),
  }
}

const prepareMethods = (todoMethods: toAnalyseType['methods']) =>
  typeof todoMethods === 'string'
    ? todoMethods === '*'
      ? ([] as METHODS_TYPE[]).concat(LIT_MATCHING_METHODS).concat(FN_MATCHING_METHODS)
      : [todoMethods]
    : Array.isArray(todoMethods)
    ? R.uniq(todoMethods)
    : assertNever(todoMethods)

const loadLib = (LIB_PATH: string, lib: Unbox<toAnalyseType['libs']>) =>
  lib === '*'
    ? getLibNameVersionSigFiles(LIB_PATH)
    : getLibNameVersionSigFiles(
        LIB_PATH,
        lib.name,
        'version' in lib ? lib.version : undefined,
        'file' in lib ? `${lib.file}.json` : undefined,
      )

const loadAnalysis = async ({ LIB_PATH }: { LIB_PATH: string }) => {
  const preprocessApps = new Map<string, appDesc>()
  const preprocessLibs = new Map<string, libNameVersion>()
  const analyse = [] as _analysisDescriptors[]
  const aggregate = [] as _aggregateDescriptors[]

  for (let { methods: todoMethods, app, files, libs } of TO_ANALYSE) {
    preprocessApps.set(appToString(app), app)

    const analyseMap = new Map<string, libNameVersionSigFile>()
    const aggregateMap = new Map<string, libName>()

    for (let lib of libs) {
      for (let l of await loadLib(LIB_PATH, lib)) {
        preprocessLibs.set(toStrNV(l), { name: l.name, version: l.version })
        analyseMap.set(toStrNVF(l), l)
        aggregateMap.set(toStrN(l), { name: l.name })
      }
    }

    const methods = prepareMethods(todoMethods)

    analyse.push({ methods, app, files, libs: [...analyseMap.values()] })
    aggregate.push({ app, files, libs: [...aggregateMap.values()] })
  }

  return {
    preprocess: {
      apps: [...preprocessApps.values()],
      libs: [...preprocessLibs.values()],
    },
    analyse,
    aggregate,
  }
}

export const environment = {
  APPS_PATH: {},
  LIBS_PATH: {},
}

let terminating = false

export const main: MainFn<typeof environment> = async (
  log,
  { OUT, APPS_PATH: APP_PATH, LIBS_PATH: LIB_PATH },
) => {
  const TO_ANALYSE_FILE = join(OUT, TO_ANALYSE_FILENAME)
  const TO_ANALYSE_PREPARED_FILE = join(OUT, TO_ANALYSE_PREPARED_FILENAME)
  const ANALYSIS_PATH = join(OUT, ANALYSIS_DIR_NAME)
  const RESULTS_FILE = join(ANALYSIS_PATH, RESULTS_FILENAME)

  const { rl, pa, me, ag, rt, pt } = await initPool({ log, APP_PATH, LIB_PATH, ANALYSIS_PATH })
  const toAnalyse = await loadAnalysis({ LIB_PATH })

  await Promise.all([
    myWriteJSON({ content: TO_ANALYSE, file: TO_ANALYSE_FILE }),
    myWriteJSON({ content: toAnalyse, file: TO_ANALYSE_PREPARED_FILE }),
  ])

  const preprocessLibsPromises = R.map(
    (lib) => async () => ({ done: terminating ? false : await rl(lib), lib }),
    toAnalyse.preprocess.libs,
  )

  const preprocessAppsPromises = R.map(
    (app) => async () => ({ done: terminating ? false : await pa(app), app }),
    toAnalyse.preprocess.apps,
  )

  const analysisPromises = R.pipe(
    // transform array
    R.chain(({ methods, app, files, libs }: _analysisDescriptors) =>
      R.chain(
        (file) =>
          R.map((lib): [analysisDescriptor, METHODS_TYPE[]] => [{ app, file, lib }, methods], libs),
        files,
      ),
    ),
    // run analysis
    R.map(([desc, methods]) => async () => ({
      done: terminating
        ? false
        : await R.pipe(
            R.map(async (m: METHODS_TYPE) => [m, await me(m, desc)] as [METHODS_TYPE, boolean]),
            (x) => Promise.all(x),
            async (x) => fromEntries(await x),
          )(methods),
      ...desc,
    })),
  )(toAnalyse.analyse)

  const aggregatePromises = R.pipe(
    // transform array
    R.chain(({ app, files, libs }: _aggregateDescriptors) =>
      R.map((file) => ({ app, file, libs }), files),
    ),
    // run aggregation
    R.map((x) => async () => ({ done: terminating ? false : ag(x), ...x })),
  )(toAnalyse.aggregate)

  log.info('reanalysing libs')
  await resolveAllOrInParallel(preprocessLibsPromises)
  log.info('preprocessing apps')
  await resolveAllOrInParallel(preprocessAppsPromises)
  await rt()

  log.info('started analysis')
  const results = await resolveAllOrInParallel(analysisPromises)
  log.info('started aggregation')
  const aggregated = await resolveAllOrInParallel(aggregatePromises)
  log.info(`${terminating ? 'terminated' : 'finished'} analysis+aggregation`)

  await myWriteJSON({ file: RESULTS_FILE, content: { results, aggregated } })

  await pt()
}

export const terminate: TerminateFn = (log) =>
  R.once(() => {
    log.info('started terminating')
    terminating = true
  })
