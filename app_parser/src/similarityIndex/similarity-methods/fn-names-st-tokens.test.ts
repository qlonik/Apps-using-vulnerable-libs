import { test } from 'ava'
import { cloneDeep } from 'lodash'
import { EXPECTED_SIMILARITY, LIB_SIG, UNKNOWN_SIG } from './_test-data'
import { librarySimilarityByFunctionNamesAndStatementTokens } from './fn-names-st-tokens'

test('librarySimilarityByFunctionNamesAndStatementTokens', t => {
  const unknown = { functionSignature: cloneDeep(UNKNOWN_SIG), literalSignature: [] }
  const lib = { functionSignature: cloneDeep(LIB_SIG), literalSignature: [] }
  const result = librarySimilarityByFunctionNamesAndStatementTokens({ unknown, lib })
  t.deepEqual(EXPECTED_SIMILARITY, result)
})
