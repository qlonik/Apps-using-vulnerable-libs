import { curry, head, isEqual, once, partition } from 'lodash/fp'
import { Logger } from 'pino'
import { FunctionSignature } from '../extractStructure'
import {
  data,
  GoneMisMatchedFn,
  MisMatchedReason as r,
  ModMisMatchedFn,
  noMisMatched,
} from '../manual-reports/rnd-fns-eval'
import {
  analysisFile,
  APP_TYPES,
  appDesc,
  getAnalysedData,
  getCordovaAnalysisFiles,
  getReactNativeAnalysisFiles,
} from '../parseApps'
import { getLibNameVersionSigContents, libNameVersionSigFile } from '../parseLibraries'
import { jaccardLike } from '../similarityIndex/set'
import { assertNever, loAsync } from '../utils'
import { assert } from '../utils/logger'
import { MainFn, TerminateFn } from './_all.types'

type appSpec = {
  app: appDesc
  file: analysisFile
  signature: FunctionSignature
}
/**
 * @throws when app does not pass common checks and when loaded signature is
 *   not expected
 * @param APPS_PATH locations of all apps
 * @param spec app signature specifier
 * @param _log logger instance
 */
const checkAppFnSig = async (
  APPS_PATH: string,
  spec: appSpec,
  _log: Logger,
): Promise<FunctionSignature> => {
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
  const signature = assert(data.signature, _log, 'this app has no signature for this file')
  const fnSig = assert(
    signature.functionSignature[spec.signature.index],
    _log,
    'fn sig at specified index does not exist',
  )
  assert(
    isEqual(fnSig, spec.signature),
    _log.child({ fnSig: { index: fnSig.index } }),
    'specified fn sig is not the same as loaded fn sig',
  )
  return spec.signature
}

const loadLibSig = curry(
  /**
   * @throws when loaded 0 or more than 1 signature.
   * @param _log
   * @param LIBS_PATH
   * @param spec
   */
  async (
    _log: Logger,
    LIBS_PATH: string,
    spec: libNameVersionSigFile,
  ): Promise<FunctionSignature[]> => {
    const contents = await getLibNameVersionSigContents(
      LIBS_PATH,
      spec.name,
      spec.version,
      spec.file,
    )
    assert(
      contents.length === 1,
      _log.child({ numLoadedSigs: contents.length }),
      'not a single signature loaded',
    )

    const libSig = assert(head(contents), _log, 'no lib signature')
    return libSig.signature.functionSignature
  },
)

type libSpec = libNameVersionSigFile & { index: number }
const loadLibFnSig = curry(
  /**
   * @throws when signature at given index does not exist, and when signature
   *   at given index does not have expected index.
   * @param log logger instance
   * @param LIBS_PATH path to all libraries
   * @param spec function signature specifier
   */
  async (log: Logger, LIBS_PATH: string, spec: libSpec): Promise<FunctionSignature> => {
    const _log = log.child({ 'lib-spec': spec })
    const libFnSig = await loadLibSig(_log, LIBS_PATH, spec)
    const fnSig = assert(libFnSig[spec.index], _log, 'fn sig at specified index does not exist')
    assert(
      fnSig.index === spec.index,
      _log.child({ fnSig: { index: fnSig.index } }),
      'fn sig at specified index has unexpected index',
    )
    return fnSig
  },
)

const noopMap = () => () => async (x: any): Promise<typeof x> => x
const jl = (t: FunctionSignature) => (sig: FunctionSignature) =>
  jaccardLike(t.fnStatementTokens, sig.fnStatementTokens)

const targetSigCheckerFactory =
  /**
   * Function computing indexValues between target function and array of passed
   * functions
   * @param LIBS_PATH location of all libs
   * @param t target function signature
   * @param _log logger instance
   */
  (LIBS_PATH: string, t: FunctionSignature, _log: Logger) =>
    /**
     *
     * @param fn mapping function
     */
    <T = libSpec>(
      fn: (log: Logger) => (libs_path: string) => (x: T) => Promise<FunctionSignature>,
    ) =>
      /**
       * Function returns pair of numbered index value arrays. First array have
       * all index values equal to 1, and second array contains all other.
       * @param c array of libSpecs to check
       */
      async (c: T[]) => {
        const indValPs = c
          .map(fn(_log)(LIBS_PATH))
          .map(loAsync(jl(t)))
          .map(async (x, _i) => ({ ...(await x), _i }))
        return partition((x) => x.val === 1, await Promise.all(indValPs))
      }

export const environment = {
  APPS_PATH: {},
  LIBS_PATH: {},
}

export const main: MainFn<typeof environment> = async function main(log, { APPS_PATH, LIBS_PATH }) {
  const totals = await data.concat(noMisMatched).reduce(
    async (acc, fn) => {
      const _log = log.child({
        'app-spec': {
          ...fn.app,
          path: fn.file.path,
          index: fn.signature.index,
        },
      })

      const targetSig = await checkAppFnSig(APPS_PATH, fn, _log)
      const tSigCh = targetSigCheckerFactory(LIBS_PATH, targetSig, _log)
      const tSigChFromLibSpec = tSigCh(loadLibFnSig)
      const tSigChFromLib = tSigCh(noopMap)

      const [targetVersions, expMatch] = partition((o) => o.targetVersion, fn.matchedFns)
      const [expMisMatch, noFn] = partition(
        (o) => o.reason === r.mod || o.reason === r.min,
        fn.misMatchedFns,
      ) as [ModMisMatchedFn[], GoneMisMatchedFn[]]

      const [
        [tvOnes, tvOther],
        [emOnes, emOther],
        [emmOnes, emmOther],
        noFnRatings,
      ] = await Promise.all([
        tSigChFromLibSpec(targetVersions),
        tSigChFromLibSpec(expMatch),
        tSigChFromLibSpec(expMisMatch),
        Promise.all(
          noFn.map(async (libSigSpec) => {
            const libLog = _log.child({ 'lib-spec': libSigSpec })
            const [nfOnes, nfOther] = await tSigChFromLib(
              await loadLibSig(libLog, LIBS_PATH, libSigSpec),
            )
            if (nfOnes.length !== 0) {
              libLog.error(
                { 'ones-i': nfOnes.map((o) => o._i) },
                'some unexpected non-existent fn matched with one',
              )
            }
            return [nfOnes, nfOther]
          }),
        ),
      ])

      if (tvOther.length !== 0) {
        _log.error(
          { 'not-ones-i': tvOther.map((o) => o._i) },
          'not all target versions have 100% match',
        )
      }
      if (emOther.length !== 0) {
        _log.error(
          { 'not-ones-i': emOther.map((o) => o._i) },
          'not all expected matched have 100% match',
        )
      }
      if (emmOnes.length !== 0) {
        _log.error(
          { 'ones-i': emmOnes.map((o) => o._i) },
          'some expected mismatches have 100% match',
        )
      }

      const noFnTot = noFnRatings.reduce(
        (acc, [nfOnes, nfOther]) => ({
          num: acc.num + nfOther.length,
          den: acc.den + nfOnes.length + nfOther.length,
        }),
        { num: 0, den: 0 },
      )

      const a = await acc
      return {
        tot: a.tot + 1,
        tv: {
          num: a.tv.num + tvOnes.length,
          den: a.tv.den + tvOnes.length + tvOther.length,
        },
        em: {
          num: a.em.num + emOnes.length,
          den: a.em.den + emOnes.length + emOther.length,
        },
        emm: {
          num: a.emm.num + emmOther.length,
          den: a.emm.den + emmOnes.length + emmOther.length,
        },
        noFn: {
          num: a.noFn.num + noFnTot.num,
          den: a.noFn.den + noFnTot.den,
        },
      }
    },
    Promise.resolve({
      tot: 0,
      tv: { num: 0, den: 0 },
      em: { num: 0, den: 0 },
      emm: { num: 0, den: 0 },
      noFn: { num: 0, den: 0 },
    }),
  )

  log.info(
    {
      totals: {
        tot: totals.tot,
        tv: { val: totals.tv.num / totals.tv.den, ...totals.tv },
        em: { val: totals.em.num / totals.em.den, ...totals.em },
        emm: { val: totals.emm.num / totals.emm.den, ...totals.emm },
        noFn: { val: totals.noFn.num / totals.noFn.den, ...totals.noFn },
      },
    },
    "Expected results for function matching. All 'vals' should be equal to 1",
  )
}

export const terminate: TerminateFn = () => once(function terminate() {})
