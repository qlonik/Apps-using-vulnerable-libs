import { mkdirp, pathExists } from 'fs-extra'
import { padEnd, round, sortBy } from 'lodash'
import { join } from 'path'
import { worker, WorkerFunctionsMap } from 'workerpool'
import { signatureNew } from '../extractStructure'
import {
  analysisFile,
  appDesc,
  getAnalysedData,
  isCordovaAnalysisFile,
  isreactNativeAnalysisFile,
} from '../parseApps'
import { getLibNameVersionSigContents } from '../parseLibraries'
import {
  librarySimilarityByFunctionStatementTokens,
  librarySimilarityByFunctionStatementTokens_v2,
  librarySimilarityByLiteralValues,
} from '../similarityIndex/similarity-methods'
import { SimMapWithConfidence } from '../similarityIndex/similarity-methods/types'
import { myWriteJSON } from '../utils/files'
import { stdoutLog } from '../utils/logger'
import {
  messages,
  METHODS_TYPE, // eslint-disable-line no-unused-vars
} from './analyse-specified'

type wFnMap = WorkerFunctionsMap<messages>
type fnName<K extends METHODS_TYPE = METHODS_TYPE> = {
  fn: <T extends signatureNew>(unknown: T, lib: T) => SimMapWithConfidence
  name: K
}

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

    const libSigs = await getLibNameVersionSigContents(
      libs,
      lib.name,
      lib.version,
      `${lib.file}.json`,
    )
    if (libSigs.length > 1) {
      log(`lib ${lib.name} ${lib.version} ${lib.file}.json has more than one element`)
    }
    const libSig = libSigs[0].signature || {
      functionSignature: [],
      literalSignature: [],
    }

    const dirPath = join(
      save,
      transformAppPath(app),
      transformFilePath(file),
      lib.name,
      `${lib.version}_${lib.file}`,
    )
    await mkdirp(dirPath)

    const filePath = join(dirPath, `${name}.json`)
    if (!await pathExists(filePath) || forceRedo) {
      const result = await compareAndTransformSim(fn)(appSig)(libSig)
      await myWriteJSON({ file: filePath, content: result })
    }

    return true
  }
}

const noop = () => false

const aggregate: wFnMap['aggregate'] = async ({
  apps,
  libs,
  save,
  app,
  file,
  libNames,
  forceRedo = false,
}) => {
  return false
}

const workerMap: wFnMap = {
  aggregate,
  // will be replaced with actual functions.
  'lit-vals': noop,
  'fn-st-toks-v1': noop,
  'fn-st-toks-v2': noop,
  'fn-st-toks-v3': noop,
  'fn-st-types': noop,
  'fn-names': noop,
  'fn-names-st-toks': noop,
}
const methods: fnName[] = [
  { name: 'lit-vals', fn: librarySimilarityByLiteralValues },
  { name: 'fn-st-toks-v1', fn: librarySimilarityByFunctionStatementTokens },
  { name: 'fn-st-toks-v2', fn: librarySimilarityByFunctionStatementTokens_v2 },
  // { name: 'fn-st-toks-v3', fn: librarySimilarityByFunctionStatementTokens_v3 },
  // { name: 'fn-st-types', fn: librarySimilarityByFunctionStatementTypes },
  // { name: 'fn-names', fn: librarySimilarityByFunctionNames },
  // { name: 'fn-names-st-toks', fn: librarySimilarityByFunctionNamesAndStatementTokens },
]

worker(
  methods.reduce((acc, { fn, name }) => ({ ...acc, [name]: analyse({ fn, name }) }), workerMap),
)

process.on('SIGINT', () => {})
