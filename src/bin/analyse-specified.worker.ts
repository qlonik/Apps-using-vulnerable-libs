import { codeBlock } from 'common-tags'
import { mkdirp, pathExists, readdir, readJSON, writeFile } from 'fs-extra'
import padEnd from 'lodash/padEnd'
import round from 'lodash/round'
import { basename, extname, join } from 'path'
import { Logger } from 'pino'
import R from 'ramda'
import { worker, WorkerFunctionsMap } from 'workerpool'
import { signatureNew } from '../extractStructure'
import {
  analysisFile,
  appDesc,
  getAnalysedData,
  isCordovaAnalysisFile,
  isReactNativeAnalysisFile,
} from '../parseApps'
import { getLibNameVersionSigContents, libNameVersionSigFile } from '../parseLibraries'
import { Similarity } from '../similarityIndex'
import { indexValue } from '../similarityIndex/set'
import {
  FN_MATCHING_METHODS,
  FN_MATCHING_METHODS_TYPE,
  LIT_MATCHING_METHODS,
  LIT_MATCHING_METHODS_TYPE,
  returnFunctionMatchingFn,
  returnLiteralMatchingFn,
} from '../similarityIndex/similarity-methods'
import {
  DefiniteMap,
  probIndex,
  SimMapWithConfidence,
} from '../similarityIndex/similarity-methods/types'
import { SortedLimitedList } from '../similarityIndex/sorted-limited-list'
import { myWriteJSON } from '../utils/files'
import logger from '../utils/logger'
import { METHODS_TYPE } from './_analyse-specified.config'
import { messages } from './analyse-specified'

type wFnMap = WorkerFunctionsMap<messages>
type fnName<K extends METHODS_TYPE = METHODS_TYPE> = {
  fn: <T extends signatureNew>(l: Logger | undefined, unknown: T, lib: T) => SimMapWithConfidence
  name: K
}

const TOP_HUNDRED_FILE = '_top_hundred.json'
const TOP_25_FILE = '_top_25.json'

const log = logger.child({ name: `analyse-specified.worker.${process.pid}` })

const transformAppPath = ({ type, section, app }: appDesc) => `${type}___${section}___${app}`
const transformFilePath = (f: analysisFile) => {
  if (isCordovaAnalysisFile(f)) {
    return f.path.replace('/', '_')
  } else if (isReactNativeAnalysisFile(f)) {
    return f.path
  } else {
    return f.path
  }
}

const roundAndPad = (n: number) => padEnd(`${round(n, 6)},`, 9)
const transformAndSortMapping = R.pipe(
  (mapping: DefiniteMap<number, probIndex>) => [...mapping.entries()],
  R.map(([key, { index, prob }]) => {
    const paddedMap = padEnd(`${key}->${index}`, 12)
    const paddedProb = `val: ${roundAndPad(prob.val)} num: ${prob.num}, den: ${prob.den}`

    return { s: `${paddedMap} ({ ${paddedProb} })`, order: [-prob.val, key] }
  }),
  R.sortWith([(o1, o2) => o1.order[0] - o2.order[0], (o1, o2) => o1.order[1] - o2.order[1]]),
  R.map(({ s }) => ({ m: s, c: [] })),
)

type retType = { time: number; similarity: indexValue; mapping: { m: string; c: string[] }[] }
const compareAndTransformSim = async (
  method: fnName['fn'],
  unknown: signatureNew,
  lib: signatureNew,
): Promise<retType> => {
  const start = process.hrtime()
  const { similarity, mapping } = method(undefined, unknown, lib)
  const diff = process.hrtime(start)

  return {
    time: round(diff[0] + diff[1] / 1e9, 3),
    similarity,
    mapping: transformAndSortMapping(mapping),
  }
}
const formatRetType = (o: retType): string => {
  const timeEncoded = JSON.stringify(o.time)
  const similarityEncoded = JSON.stringify(o.similarity, null, ' ')
    .replace(/\n/g, ' ')
    .replace(/ +/g, ' ')
  const mappingEncoded = o.mapping
    .map(({ m, c }) => `{ "m": ${JSON.stringify(m)}, "c": ${JSON.stringify(c)} }`)
    .join(',\n')

  return codeBlock`
  {
    "time": ${timeEncoded},
    "similarity": ${similarityEncoded},
    "mapping": [
      ${mappingEncoded}
    ]
  }
  `
}

const analyse = <T extends METHODS_TYPE>({ fn, name }: fnName<T>): wFnMap[T] => {
  return async ({ APP_PATH, LIB_PATH, ANALYSIS_PATH, app, file, lib, forceRedo = false }) => {
    const appAnalysedPerFile = await getAnalysedData(APP_PATH, app, [file])
    if (appAnalysedPerFile.length > 1) {
      log.warn('appAnalysedPerFile has more than one element')
    }
    const appSig = appAnalysedPerFile[0].signature || {
      functionSignature: [],
      literalSignature: [],
    }

    const libFileName = basename(lib.file, extname(lib.file))
    const libSigs = await getLibNameVersionSigContents(LIB_PATH, lib.name, lib.version, lib.file)
    if (libSigs.length > 1) {
      log.warn(`lib ${lib.name} ${lib.version} ${libFileName}.json has more than one element`)
    }
    const libSig = libSigs[0].signature || {
      functionSignature: [],
      literalSignature: [],
    }

    const dirPath = join(
      ANALYSIS_PATH,
      transformAppPath(app),
      transformFilePath(file),
      lib.name,
      `${lib.version}_${libFileName}`,
    )
    await mkdirp(dirPath)

    const filePath = join(dirPath, `${name}.json`)
    if (forceRedo || !(await pathExists(filePath))) {
      const result = await compareAndTransformSim(fn, appSig, libSig)
      await writeFile(filePath, formatRetType(result))
    }

    return true
  }
}

const aggregate: wFnMap['aggregate'] = async ({ ANALYSIS_PATH, app, file, libs }) => {
  const wDir = join(ANALYSIS_PATH, transformAppPath(app), transformFilePath(file))
  const predicate = (s: Similarity) => -s.similarity.val
  type sllsMap = { [S in METHODS_TYPE]: SortedLimitedList<Similarity> }
  type simMap = { [S in METHODS_TYPE]: Similarity[] }
  const globalSlls = {} as sllsMap

  for (let { name: libName } of libs) {
    const libDir = join(wDir, libName)
    const filesVersions = await readdir(libDir)

    const similarityResultsForAllVersions = await filesVersions
      .filter((n) => !n.startsWith('_'))
      .reduce(
        async (acc, fileVersion) => {
          const awaited = await acc

          const [version, file] = fileVersion.split('_')
          const lib = { name: libName, version, file: `${file}.json` }

          const loadedTypeNames = await readdir(join(libDir, fileVersion))
          const types = await Promise.all(
            loadedTypeNames.map(async (typeName) => {
              return {
                lib,
                methodName: basename(typeName, extname(typeName)) as METHODS_TYPE,
                content: (await readJSON(join(libDir, fileVersion, typeName))) as retType,
              }
            }),
          )

          return awaited.concat(types)
        },
        Promise.resolve([] as {
          lib: libNameVersionSigFile
          methodName: METHODS_TYPE
          content: retType
        }[]),
      )

    const slls = similarityResultsForAllVersions.reduce(
      (acc, { lib, methodName, content: { similarity } }) => ({
        ...acc,
        [methodName]: (acc[methodName] || new SortedLimitedList({ limit: 25, predicate })).push({
          ...lib,
          similarity,
        }),
      }),
      {} as sllsMap,
    )

    const reducedSll = (Object.keys(slls) as METHODS_TYPE[]).reduce(
      (acc, key) => {
        const globalSll =
          globalSlls[key] || (globalSlls[key] = new SortedLimitedList({ limit: 100, predicate }))

        const sllValue = slls[key].value()
        sllValue.forEach((sim) => globalSll.push(sim))
        return { ...acc, [key]: sllValue }
      },
      {} as simMap,
    )

    await mkdirp(libDir)
    await myWriteJSON({ file: join(libDir, TOP_25_FILE), content: reducedSll })
  }

  const reducedGlobalSll = (Object.keys(globalSlls) as METHODS_TYPE[]).reduce(
    (acc, key) => {
      return { ...acc, [key]: globalSlls[key].value() }
    },
    {} as simMap,
  )

  await mkdirp(wDir)
  await myWriteJSON({ file: join(wDir, TOP_HUNDRED_FILE), content: reducedGlobalSll })

  return true
}

worker<messages>({
  aggregate,
  ...LIT_MATCHING_METHODS.reduce(
    (acc, name) => ({ ...acc, [name]: analyse({ fn: returnLiteralMatchingFn(name), name }) }),
    {} as Pick<wFnMap, LIT_MATCHING_METHODS_TYPE>,
  ),
  ...FN_MATCHING_METHODS.reduce(
    (acc, name) => ({ ...acc, [name]: analyse({ fn: returnFunctionMatchingFn(name), name }) }),
    {} as Pick<wFnMap, FN_MATCHING_METHODS_TYPE>,
  ),
})

process.on('SIGINT', () => {})
