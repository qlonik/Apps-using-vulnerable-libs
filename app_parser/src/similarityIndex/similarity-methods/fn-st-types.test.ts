import { test } from 'ava'
import { cloneDeep } from 'lodash'
import { EXPECTED_SIMILARITY, LIB_SIG, UNKNOWN_SIG } from './_test-data'
import { librarySimilarityByFunctionStatementTypes } from './fn-st-types'

test('librarySimilarityByFunctionStatementTypes', t => {
  const unknown = { functionSignature: cloneDeep(UNKNOWN_SIG), literalSignature: [] }
  const lib = { functionSignature: cloneDeep(LIB_SIG), literalSignature: [] }
  const result = librarySimilarityByFunctionStatementTypes({ unknown, lib })
  t.deepEqual(EXPECTED_SIMILARITY, result)
})
