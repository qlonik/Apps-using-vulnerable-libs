import { test } from 'ava'
import suite from 'chuhai'
import { Logger } from 'pino'
import { arbSignatureWithCommentsPair } from '../../_helpers/arbitraries'
import { check } from '../../_helpers/property-test'
import {
  FunctionSignature,
  FunctionSignatures,
  LiteralSignature,
  LiteralSignatures,
} from '../../extractStructure'
import {
  librarySimilarityByFunctionNames_jaccardIndex,
  librarySimilarityByFunctionNames_ourIndex,
  librarySimilarityByFunctionNamesAndStatementTokens,
  librarySimilarityByFunctionStatementTokens as librarySimilarityByFunctionStatementTokens_v1,
  librarySimilarityByFunctionStatementTokens_v2,
  librarySimilarityByFunctionStatementTokens_v3,
  librarySimilarityByFunctionStatementTokens_v4,
  librarySimilarityByFunctionStatementTokens_v5,
  librarySimilarityByFunctionStatementTokens_v6,
  librarySimilarityByFunctionStatementTypes,
  librarySimilarityByLiteralValues,
} from './index'

type MatchFn =
  | (<T extends FunctionSignature[] | FunctionSignatures>(l: Logger | undefined, a: T, b: T) => any)
  | (<T extends LiteralSignature[] | LiteralSignatures>(l: Logger | undefined, a: T, b: T) => any)
const tests: [string, MatchFn][] = [
  ['FnStTypes', librarySimilarityByFunctionStatementTypes],
  ['FnNames_ourIndex', librarySimilarityByFunctionNames_ourIndex],
  ['FnNames_jaccardIndex', librarySimilarityByFunctionNames_jaccardIndex],
  ['FnNamesAndStTokens', librarySimilarityByFunctionNamesAndStatementTokens],
  ['LitVals', librarySimilarityByLiteralValues],
  ['FnStTokens_v1', librarySimilarityByFunctionStatementTokens_v1],
  ['FnStTokens_v2', librarySimilarityByFunctionStatementTokens_v2],
  ['FnStTokens_v3', librarySimilarityByFunctionStatementTokens_v3],
  ['FnStTokens_v4', librarySimilarityByFunctionStatementTokens_v4],
  ['FnStTokens_v5', librarySimilarityByFunctionStatementTokens_v5],
  ['FnStTokens_v6', librarySimilarityByFunctionStatementTokens_v6],
]
test.serial(
  'matching fn perf',
  check(
    { tests: 1, size: 500, rngState: '010123456789abcdef' },
    arbSignatureWithCommentsPair,
    async (t, [a, b]) => {
      /* eslint-disable no-console */
      const origConsoleLog = console.log
      console.log = t.log

      await suite(t.title, s => {
        s.set('maxTime', 2)
        s.set('minSamples', 10)

        let val: ReturnType<MatchFn> | null = null

        s.cycle(() => {
          t.not(null, val)
          t.is('object', typeof val)

          val = null
        })

        for (let [name, fn] of tests) {
          s.bench(name, () => {
            val = fn(undefined, a, b)
          })
        }
      })

      console.log = origConsoleLog
      /* eslint-enable no-console */
    },
  ),
)
