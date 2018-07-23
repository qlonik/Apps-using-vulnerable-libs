import { stripIndent } from 'common-tags'
import { isEqual, once, uniqWith } from 'lodash/fp'
import head from 'lodash/fp/head'
import { Logger } from 'pino'
import { signatureNew, signatureWithComments } from '../extractStructure'
import { data, noMisMatched } from '../manual-reports/rnd-fns-eval'
import {
  analysisFile,
  APP_TYPES,
  appDesc,
  getAnalysedData,
  getCordovaAnalysisFiles,
  getReactNativeAnalysisFiles,
} from '../parseApps'
import { getLibNameVersionSigContents, libNameVersionSigFile } from '../parseLibraries'
import { librarySimilarityByFunctionStatementTokens_v6 } from '../similarityIndex/similarity-methods'
import { assertNever } from '../utils'
import { assert } from '../utils/logger'
import { MainFn, TerminateFn } from './_all.types'

const APPS_PATH = '../data/sample_apps'
const LIBS_PATH = '../data/sample_libs'

type appSpec = { app: appDesc; file: analysisFile }
const loadAppSig = async (_log: Logger, spec: appSpec): Promise<signatureWithComments> => {
  const fn =
    spec.app.type === APP_TYPES.cordova
      ? getCordovaAnalysisFiles
      : spec.app.type === APP_TYPES.reactNative
        ? getReactNativeAnalysisFiles
        : assertNever(spec.app.type)
  const loadedFiles: analysisFile[] = await fn(APPS_PATH, spec.app)
  assert(loadedFiles.length !== 0, _log, 'this app has no analysis files')

  const neededFile: analysisFile = assert(
    loadedFiles.find(({ path }) => path === spec.file.path),
    _log,
    'this app does not have specified file',
  )
  const data = await getAnalysedData(APPS_PATH, spec.app, neededFile)
  return assert(data.signature, _log, 'this app has no signature for this file')
}
const loadLibSig = async (_log: Logger, spec: libNameVersionSigFile): Promise<signatureNew> => {
  const contents = await getLibNameVersionSigContents(LIBS_PATH, spec.name, spec.version, spec.file)
  assert(
    contents.length === 1,
    _log.child({ numLoadedSigs: contents.length }),
    'not a single signature loaded',
  )

  const libSig = assert(head(contents), _log, 'no lib signature')
  return libSig.signature
}

type AppFileTargetSpec = {
  app: appDesc
  file: analysisFile
  target: libNameVersionSigFile
}
export const main: MainFn = async function main(log) {
  const appFileTargetSpecs = data
    .concat(noMisMatched)
    .map(({ app, file, matchedFns }) => {
      const targets = matchedFns
        .filter((o) => o.targetVersion)
        .map(({ name, version, file }): libNameVersionSigFile => ({ name, version, file }))
      return targets.length === 0 ? null : { app, file, targets }
    })
    .filter((i): i is NonNullable<typeof i> => i !== null && i !== undefined)
    .reduce(
      (acc, spec) =>
        acc.concat(spec.targets.map((target) => ({ app: spec.app, file: spec.file, target }))),
      [] as AppFileTargetSpec[],
    )
  const uniqAppFileTargetSpecs = uniqWith(isEqual, appFileTargetSpecs)
  const totals = await uniqAppFileTargetSpecs.reduce(
    async (acc, spec) => {
      const _log = log.child({
        'app-spec': { ...spec.app, path: spec.file },
        'lib-spec': spec.target,
      })

      const [appSig, libSig] = await Promise.all([
        loadAppSig(_log, spec),
        loadLibSig(_log, spec.target),
      ])

      const { similarity } = librarySimilarityByFunctionStatementTokens_v6(_log, appSig, libSig)

      const t = await acc
      return {
        tot: t.tot + 1,
        emptyLib: t.emptyLib + (libSig.functionSignature.length === 0 ? 1 : 0),
        exactMatch: t.exactMatch + (similarity.val === 1 ? 1 : 0),
      }
    },
    Promise.resolve({
      tot: 0,
      emptyLib: 0,
      exactMatch: 0,
    }),
  )

  log.info(
    {
      totals: {
        tot: totals.tot,
        emptyLib: totals.emptyLib,
        exactMatch: totals.exactMatch,
      },
    },
    stripIndent`
      Expected results for lib matching.
      emptyLib should be 0, exactMatch should be equal to tot
    `,
  )
}

export const terminate: TerminateFn = () => once(function terminate() {})
