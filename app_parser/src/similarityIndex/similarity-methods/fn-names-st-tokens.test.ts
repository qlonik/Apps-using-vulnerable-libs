import { test } from 'ava'
import { cloneDeep } from 'lodash'
import { arbFunctionSignatureArr, arbFunctionSignatureArrPair } from '../../_helpers/arbitraries'
import { check } from '../../_helpers/property-test'
import { EXPECTED_SIMILARITY, LIB_SIG, UNKNOWN_SIG } from './_test-data'
import { librarySimilarityByFunctionNamesAndStatementTokens } from './fn-names-st-tokens'

test('librarySimilarityByFunctionNamesAndStatementTokens', t => {
  const result = librarySimilarityByFunctionNamesAndStatementTokens(
    cloneDeep(UNKNOWN_SIG),
    cloneDeep(LIB_SIG),
  )
  t.deepEqual(EXPECTED_SIMILARITY, result)
})

test(
  'calling with array === calling with object',
  check(arbFunctionSignatureArrPair, (t, [u, l]) => {
    t.deepEqual(
      librarySimilarityByFunctionNamesAndStatementTokens(u, l),
      librarySimilarityByFunctionNamesAndStatementTokens(
        { functionSignature: u },
        { functionSignature: l },
      ),
    )
  }),
)

test(
  'commutative',
  check(arbFunctionSignatureArrPair, (t, [u, l]) => {
    t.deepEqual(
      librarySimilarityByFunctionNamesAndStatementTokens(u, l),
      librarySimilarityByFunctionNamesAndStatementTokens(l, u),
    )
  }),
)

test(
  'produces 0% match when comparing with empty signature',
  check(arbFunctionSignatureArr, (t, a) => {
    const similarity = librarySimilarityByFunctionNamesAndStatementTokens(a, [])

    t.is(0, similarity.val)
    t.is(0, similarity.num)
    t.not(0, similarity.den)
  }),
)

test('produces 100% match when comparing empty signatures', t => {
  t.deepEqual(
    { val: 1, num: 0, den: 0 },
    librarySimilarityByFunctionNamesAndStatementTokens([], []),
  )
})
