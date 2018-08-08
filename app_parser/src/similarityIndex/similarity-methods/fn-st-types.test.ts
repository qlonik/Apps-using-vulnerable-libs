import { test } from 'ava'
import { cloneDeep } from 'lodash'
import { arbFunctionSignatureArr, arbFunctionSignatureArrPair } from '../../_helpers/arbitraries'
import { check } from '../../_helpers/property-test'
import { EXPECTED_MAPPING, EXPECTED_SIMILARITY, LIB_SIG, UNKNOWN_SIG } from './_test-data'
import { librarySimilarityByFunctionStatementTypes } from './fn-st-types'

test('librarySimilarityByFunctionStatementTypes', t => {
  const result = librarySimilarityByFunctionStatementTypes(
    undefined,
    cloneDeep(UNKNOWN_SIG),
    cloneDeep(LIB_SIG),
  )
  t.deepEqual({ similarity: EXPECTED_SIMILARITY, mapping: EXPECTED_MAPPING }, result)
})

test(
  'calling with array === calling with object',
  check(arbFunctionSignatureArrPair, (t, [u, l]) => {
    t.deepEqual(
      librarySimilarityByFunctionStatementTypes(undefined, u, l),
      librarySimilarityByFunctionStatementTypes(
        undefined,
        { functionSignature: u },
        { functionSignature: l },
      ),
    )
  }),
)

test(
  'commutative similarity',
  check({ tests: 500 }, arbFunctionSignatureArrPair, (t, [u, l]) => {
    t.deepEqual(
      librarySimilarityByFunctionStatementTypes(undefined, u, l).similarity,
      librarySimilarityByFunctionStatementTypes(undefined, l, u).similarity,
    )
  }),
)

test(
  'produces 0% match when comparing with empty app signature',
  check(arbFunctionSignatureArr, (t, a) => {
    const { similarity, mapping } = librarySimilarityByFunctionStatementTypes(undefined, [], a)

    t.is(0, similarity.val)
    t.is(0, similarity.num)
    t.not(0, similarity.den)
    t.deepEqual(new Map(), mapping)
  }),
)

test(
  'produces 0% match when comparing with empty lib signature',
  check(arbFunctionSignatureArr, (t, a) => {
    const { similarity, mapping } = librarySimilarityByFunctionStatementTypes(undefined, a, [])

    t.is(0, similarity.val)
    t.is(0, similarity.num)
    t.not(0, similarity.den)
    t.deepEqual(new Map(), mapping)
  }),
)

test('produces 100% match when comparing empty signatures', t => {
  t.deepEqual(
    { similarity: { val: 1, num: 0, den: 0 }, mapping: new Map() },
    librarySimilarityByFunctionStatementTypes(undefined, [], []),
  )
})

test(
  'produces 100% match when comparing same signatures',
  check({ tests: 250 }, arbFunctionSignatureArr, (t, a) => {
    const { similarity: { val, num, den }, mapping } = librarySimilarityByFunctionStatementTypes(
      undefined,
      a,
      a,
    )

    t.is(1, val)
    t.is(num, den)
    t.is(a.length, mapping.size)
    for (let [from, { index: to, prob: { val, num, den } }] of mapping) {
      t.is(from, to)
      t.is(1, val)
      t.is(num, den)
    }
  }),
)
