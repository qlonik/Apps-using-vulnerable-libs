export {
  v1 as librarySimilarityByFunctionStatementTokens,
  v2 as librarySimilarityByFunctionStatementTokens_v2,
  v3 as librarySimilarityByFunctionStatementTokens_v3,
  v4 as librarySimilarityByFunctionStatementTokens_v4,
  v5 as librarySimilarityByFunctionStatementTokens_v5,
  v6 as librarySimilarityByFunctionStatementTokens_v6,
} from './fn-st-tokens'

export { librarySimilarityByFunctionStatementTypes } from './fn-st-types'

export {
  librarySimilarityByFunctionNames_ourIndex,
  librarySimilarityByFunctionNames_jaccardIndex,
} from './fn-names'

export { librarySimilarityByFunctionNamesAndStatementTokens } from './fn-names-st-tokens'

export { librarySimilarityByLiteralValues } from './lit-values'

export {
  LIT_MATCHING_METHODS,
  LIT_MATCHING_METHODS_TYPE,
  returnLiteralMatchingFn,
  FN_MATCHING_METHODS,
  FN_MATCHING_METHODS_TYPE,
  returnFunctionMatchingFn,
} from './method-getters'
