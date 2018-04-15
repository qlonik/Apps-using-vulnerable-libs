import { mkdirp, pathExists } from 'fs-extra'
import { padEnd, round, sortBy } from 'lodash'
import { basename, extname, join } from 'path'
import { worker, WorkerFunctionsMap } from 'workerpool'
import { signatureNew } from '../extractStructure'
import {
  analysisFile,
  appDesc,
  getAnalysedData,
  isCordovaAnalysisFile,
  isreactNativeAnalysisFile,
} from '../parseApps'
import { getLibNameVersionSigContents, getLibNameVersionSigFiles } from '../parseLibraries'
import {
  librarySimilarityByFunctionStatementTokens,
  librarySimilarityByFunctionStatementTokens_v2,
  librarySimilarityByLiteralValues,
} from '../similarityIndex/similarity-methods'
import { SimMapWithConfidence } from '../similarityIndex/similarity-methods/types'
import { resolveAllOrInParallel } from '../utils'
import { myWriteJSON } from '../utils/files'
import { stdoutLog } from '../utils/logger'
import { messages, METHODS_TYPE } from './analyse-specified'

const noop = () => false
type wFnMap = WorkerFunctionsMap<messages>
type fnName<K extends METHODS_TYPE = METHODS_TYPE> = {
  fn: <T extends signatureNew>(unknown: T, lib: T) => SimMapWithConfidence
  name: K
}
type fnNoopName = fnName | { fn: typeof noop; name: METHODS_TYPE }
const fnIsNoop = (fn: fnNoopName['fn']): fn is typeof noop => fn === noop

const log = stdoutLog(`analyse-specified.worker.${process.pid}`)
log.enabled = true

const transformAppPath = ({ type, section, app }: appDesc) => `${type}___${section}___${app}`
const transformFilePath = (f: analysisFile) => {
  if (isCordovaAnalysisFile(f)) {
    return f.path.replace('/', '_')
  } else if (isreactNativeAnalysisFile(f)) {
    return f.path
  } else {
    return f.path
  }
}

const compareAndTransformSim = (method: fnName['fn']) => (unknown: signatureNew) => async (
  lib: signatureNew,
) => {
  const start = process.hrtime()
  const { similarity, mapping } = method(unknown, lib)
  const diff = process.hrtime(start)

  type intermediate = { s: string; order: number[] }
  const sortedMapping = sortBy(
    [...mapping.keys()].map((key): intermediate => {
      const { index, prob } = mapping.get(key)

      const paddedMap = padEnd(`${key}->${index}`, 12)
      const roundAndPad = (n: number) => padEnd(`${round(n, 6)},`, 10)
      const paddedProb = `val: ${roundAndPad(prob.val)} num: ${prob.num}, den: ${prob.den}`

      return { s: `${paddedMap} ({ ${paddedProb} })`, order: [-prob.val, key] }
    }),
    [(o: intermediate) => o.order[0], (o: intermediate) => o.order[1]],
  ).map(({ s }: intermediate) => s)

  return { time: round(diff[0] + diff[1] / 1e9, 3), similarity, mapping: sortedMapping }
}

const analyse = <T extends METHODS_TYPE>({ fn, name }: fnName<T>): wFnMap[T] => {
  return async ({ apps, libs, save, app, file, lib, forceRedo = false }) => {
    const appAnalysedPerFile = await getAnalysedData(apps, app, [file])
    if (appAnalysedPerFile.length > 1) {
      log('appAnalysedPerFile has more than one element')
    }
    const appSig = appAnalysedPerFile[0].signature || {
      functionSignature: [],
      literalSignature: [],
    }

    let libSigFiles

    if (lib === '*') {
      libSigFiles = await getLibNameVersionSigFiles(libs)
    } else {
      const version = 'version' in lib ? lib.version : undefined
      const file = 'file' in lib ? `${lib.file}.json` : undefined
      libSigFiles = await getLibNameVersionSigFiles(libs, lib.name, version, file)
    }

    const promises = libSigFiles.map((lib) => async () => {
      const libSigs = await getLibNameVersionSigContents(libs, lib.name, lib.version, lib.file)
      if (libSigs.length > 1) {
        log(`lib ${lib.name} ${lib.version} ${lib.file}.json has more than one element`)
      }
      const libSig = libSigs[0].signature || {
        functionSignature: [],
        literalSignature: [],
      }

      const fileId = basename(lib.file, extname(lib.file))
      const dirPath = join(
        save,
        transformAppPath(app),
        transformFilePath(file),
        lib.name,
        `${lib.version}_${fileId}`,
      )
      await mkdirp(dirPath)

      const filePath = join(dirPath, `${name}.json`)
      if (!await pathExists(filePath) || forceRedo) {
        const result = await compareAndTransformSim(fn)(appSig)(libSig)
        await myWriteJSON({ file: filePath, content: result })
      }
    })

    await resolveAllOrInParallel(promises)

    return true
  }
}

const workerMap = {} as wFnMap
const methods = [
  { name: 'lit-vals', fn: librarySimilarityByLiteralValues },

  { name: 'fn-st-toks-v1', fn: librarySimilarityByFunctionStatementTokens },
  { name: 'fn-st-toks-v2', fn: librarySimilarityByFunctionStatementTokens_v2 },
  { name: 'fn-st-toks-v3', fn: noop /*librarySimilarityByFunctionStatementTokens_v3*/ },

  { name: 'fn-st-types', fn: noop /*librarySimilarityByFunctionStatementTypes*/ },
  { name: 'fn-names', fn: noop /*librarySimilarityByFunctionNames*/ },
  { name: 'fn-names-st-toks', fn: noop /*librarySimilarityByFunctionNamesAndStatementTokens*/ },
] as fnNoopName[]

worker(
  methods.reduce(
    (acc, { fn, name }) => ({ ...acc, [name]: fnIsNoop(fn) ? fn : analyse({ fn, name }) }),
    workerMap,
  ),
)

process.on('SIGINT', () => {})
