import { test } from 'ava'
import { cloneDeep } from 'lodash'
import { EXPECTED_SIMILARITY, LIB_SIG, UNKNOWN_SIG } from './_test-data'
import { librarySimilarityByFunctionStatementTypes } from './fn-st-types'

test('librarySimilarityByFunctionStatementTypes', t => {
  const result = librarySimilarityByFunctionStatementTypes(
    cloneDeep(UNKNOWN_SIG),
    cloneDeep(LIB_SIG),
  )
  t.deepEqual(EXPECTED_SIMILARITY, result)
})
