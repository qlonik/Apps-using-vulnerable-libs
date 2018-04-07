import { test } from 'ava'
import { cloneDeep } from 'lodash'
import { EXPECTED_SIMILARITY, LIB_SIG, UNKNOWN_SIG } from './_test-data'
import { librarySimilarityByFunctionNamesAndStatementTokens } from './fn-names-st-tokens'

test('librarySimilarityByFunctionNamesAndStatementTokens', t => {
  const result = librarySimilarityByFunctionNamesAndStatementTokens(
    cloneDeep(UNKNOWN_SIG),
    cloneDeep(LIB_SIG),
  )
  t.deepEqual(EXPECTED_SIMILARITY, result)
})
