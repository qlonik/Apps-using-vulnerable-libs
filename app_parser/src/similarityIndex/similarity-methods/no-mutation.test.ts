import { test } from 'ava'
import { cloneDeep } from 'lodash'
import { arbSignatureWithCommentsPair } from '../../_helpers/arbitraries'
import { check } from '../../_helpers/property-test'
import {
  librarySimilarityByFunctionNames,
  librarySimilarityByFunctionNamesAndStatementTokens,
  librarySimilarityByFunctionStatementTokens as librarySimilarityByFunctionStatementTokens_v1,
  librarySimilarityByFunctionStatementTokens_v2,
  librarySimilarityByFunctionStatementTokens_v3,
  librarySimilarityByFunctionStatementTokens_v4,
  librarySimilarityByFunctionStatementTypes,
  librarySimilarityByLiteralValues,
} from './index'

const tests: [string, (a: any, b: any) => any][] = [
  ['FnStTokens_v1', librarySimilarityByFunctionStatementTokens_v1],
  ['FnStTokens_v2', librarySimilarityByFunctionStatementTokens_v2],
  ['FnStTokens_v3', librarySimilarityByFunctionStatementTokens_v3],
  ['FnStTokens_v4', librarySimilarityByFunctionStatementTokens_v4],
  ['FnStTypes', librarySimilarityByFunctionStatementTypes],
  ['FnNames', librarySimilarityByFunctionNames],
  ['FnNamesAndStTokens', librarySimilarityByFunctionNamesAndStatementTokens],
  ['LitVals', librarySimilarityByLiteralValues],
]

for (let [name, fn] of tests) {
  test(
    name,
    check(arbSignatureWithCommentsPair, (t, [a, b]) => {
      const aCopy = cloneDeep(a)
      const bCopy = cloneDeep(b)

      fn(aCopy, bCopy)

      t.deepEqual(a, aCopy)
      t.deepEqual(b, bCopy)
    }),
  )
}
