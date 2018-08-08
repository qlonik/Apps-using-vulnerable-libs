import { test } from 'ava'
import { cloneDeep } from 'lodash'
import { Logger } from 'pino'
import { arbSignatureWithCommentsPair } from '../../_helpers/arbitraries'
import { check } from '../../_helpers/property-test'
import { signatureWithComments } from '../../extractStructure'
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
import { SimMapWithConfidence } from './types'

/* eslint-disable no-unused-vars */
declare const __x: Logger
declare const __y: signatureWithComments
declare const __z: SimMapWithConfidence
/* eslint-enable */

const tests: [
  string,
  (
    l: Logger | undefined,
    a: signatureWithComments,
    b: signatureWithComments,
  ) => SimMapWithConfidence
][] = [
  ['FnStTokens_v1', librarySimilarityByFunctionStatementTokens_v1],
  ['FnStTokens_v2', librarySimilarityByFunctionStatementTokens_v2],
  ['FnStTokens_v3', librarySimilarityByFunctionStatementTokens_v3],
  ['FnStTokens_v4', librarySimilarityByFunctionStatementTokens_v4],
  ['FnStTokens_v5', librarySimilarityByFunctionStatementTokens_v5],
  ['FnStTokens_v6', librarySimilarityByFunctionStatementTokens_v6],
  ['FnStTypes', librarySimilarityByFunctionStatementTypes],
  ['FnNames_our', librarySimilarityByFunctionNames_ourIndex],
  ['FnNames_jaccard', librarySimilarityByFunctionNames_jaccardIndex],
  ['FnNamesAndStTokens', librarySimilarityByFunctionNamesAndStatementTokens],
  ['LitVals', librarySimilarityByLiteralValues],
]

for (let [name, fn] of tests) {
  test(
    name,
    check(arbSignatureWithCommentsPair, (t, [a, b]) => {
      const aCopy = cloneDeep(a)
      const bCopy = cloneDeep(b)

      fn(undefined, aCopy, bCopy)

      t.deepEqual(a, aCopy)
      t.deepEqual(b, bCopy)
    }),
  )
}
