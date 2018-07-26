import { test } from 'ava'
import suite from 'chuhai'
import {
  arbFunctionSignatureArrPair,
  arbSignatureWithCommentsPair,
} from '../../_helpers/arbitraries'
import { check } from '../../_helpers/property-test'
import {
  FunctionSignature,
  FunctionSignatures,
  LiteralSignature,
  LiteralSignatures,
} from '../../extractStructure'
import {
  librarySimilarityByFunctionNames,
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
import { SimMapWithConfidence } from './types'

type MatchFn =
  | (<T extends FunctionSignature[] | FunctionSignatures>(a: T, b: T) => any)
  | (<T extends LiteralSignature[] | LiteralSignatures>(a: T, b: T) => any)
const tests: [string, MatchFn][] = [
  ['FnStTypes', librarySimilarityByFunctionStatementTypes],
  ['FnNames', librarySimilarityByFunctionNames],
  ['FnNamesAndStTokens', librarySimilarityByFunctionNamesAndStatementTokens],
  ['LitVals', librarySimilarityByLiteralValues],
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

      await suite('matching fn perf', s => {
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
            val = fn(a, b)
          })
        }
      })

      console.log = origConsoleLog
      /* eslint-enable no-console */
    },
  ),
)

type fnStToksMatchFn = <T extends FunctionSignature[] | FunctionSignatures>(
  a: T,
  b: T,
) => SimMapWithConfidence
const fnStToksTests: [string, fnStToksMatchFn][] = [
  ['FnStTokens_v1', librarySimilarityByFunctionStatementTokens_v1],
  ['FnStTokens_v2', librarySimilarityByFunctionStatementTokens_v2],
  ['FnStTokens_v3', librarySimilarityByFunctionStatementTokens_v3],
  ['FnStTokens_v4', librarySimilarityByFunctionStatementTokens_v4],
  ['FnStTokens_v5', librarySimilarityByFunctionStatementTokens_v5],
  ['FnStTokens_v6', (a, b) => librarySimilarityByFunctionStatementTokens_v6(undefined, a, b)],
]

test.serial(
  'fn-st-toks perf',
  check(
    { tests: 1, size: 500, rngState: '010123456789abcdef' },
    arbFunctionSignatureArrPair,
    async (t, [a, b]) => {
      /* eslint-disable no-console */
      const origConsoleLog = console.log
      console.log = t.log

      await suite('fn-st-toks perf', s => {
        s.set('maxTime', 2)
        s.set('minSamples', 10)

        let val: ReturnType<fnStToksMatchFn> | null = null

        s.cycle(() => {
          t.not(null, val)
          t.is('object', typeof val)

          val = null
        })

        for (let [name, fn] of fnStToksTests) {
          s.bench(name, () => {
            val = fn(a, b)
          })
        }
      })

      console.log = origConsoleLog
      /* eslint-enable no-console */
    },
  ),
)
