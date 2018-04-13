import { Macro, test } from 'ava'
import { cloneDeep } from 'lodash'
import {
  librarySimilarityByFunctionNames,
  librarySimilarityByFunctionNamesAndStatementTokens,
  librarySimilarityByFunctionStatementTokens as librarySimilarityByFunctionStatementTokens_v1,
  librarySimilarityByFunctionStatementTokens_v2,
  librarySimilarityByFunctionStatementTokens_v3,
  librarySimilarityByFunctionStatementTypes,
  librarySimilarityByLiteralValues,
} from './index'
import { LIB_SIG, UNKNOWN_SIG } from './_test-data'

const noDataMutation: Macro = (t, fn) => {
  const unknwn = cloneDeep(UNKNOWN_SIG)
  const lib = cloneDeep(LIB_SIG)

  fn(unknwn, lib)

  t.deepEqual(UNKNOWN_SIG, unknwn)
  t.deepEqual(LIB_SIG, lib)
}

test('FnStTokens_v1', noDataMutation, librarySimilarityByFunctionStatementTokens_v1)
test('FnStTokens_v2', noDataMutation, librarySimilarityByFunctionStatementTokens_v2)
test('FnStTokens_v3', noDataMutation, librarySimilarityByFunctionStatementTokens_v3)
test('FnStTypes', noDataMutation, librarySimilarityByFunctionStatementTypes)
test('FnNames', noDataMutation, librarySimilarityByFunctionNames)
test('FnNamesAndStTokens', noDataMutation, librarySimilarityByFunctionNamesAndStatementTokens)
test('LitVals', noDataMutation, librarySimilarityByLiteralValues)
