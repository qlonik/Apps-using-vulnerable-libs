import { test } from 'ava'
import { cloneDeep } from 'lodash'
import { arbFunctionSignatureArr, arbFunctionSignatureArrPair } from '../../_helpers/arbitraries'
import { check } from '../../_helpers/property-test'
import {
  EXPECTED_MAPPING_BY_NAMES_TOKENS,
  EXPECTED_SIMILARITY,
  LIB_SIG,
  UNKNOWN_SIG,
} from './_test-data'
import { librarySimilarityByFunctionNamesAndStatementTokens as fnNamesAndStToks } from './fn-names-st-tokens'

test('librarySimilarityByFunctionNamesAndStatementTokens', t => {
  t.deepEqual(
    { similarity: EXPECTED_SIMILARITY, mapping: EXPECTED_MAPPING_BY_NAMES_TOKENS },
    fnNamesAndStToks(undefined, cloneDeep(UNKNOWN_SIG), cloneDeep(LIB_SIG)),
  )
})

test(
  'calling with array === calling with object',
  check(arbFunctionSignatureArrPair, (t, [u, l]) => {
    t.deepEqual(
      fnNamesAndStToks(undefined, u, l),
      fnNamesAndStToks(undefined, { functionSignature: u }, { functionSignature: l }),
    )
  }),
)

test(
  'commutative similarity',
  check(arbFunctionSignatureArrPair, (t, [u, l]) => {
    t.deepEqual(
      fnNamesAndStToks(undefined, u, l).similarity,
      fnNamesAndStToks(undefined, l, u).similarity,
    )
  }),
)

test(
  'produces 0% match when comparing with empty app signature',
  check(arbFunctionSignatureArr, (t, a) => {
    const { similarity: { val, num, den }, mapping } = fnNamesAndStToks(undefined, [], a)

    t.is(0, val)
    t.is(0, num)
    t.not(0, den)
    t.deepEqual(mapping, new Map())
  }),
)

test(
  'produces 0% match when comparing with empty lib signature',
  check(arbFunctionSignatureArr, (t, a) => {
    const { similarity: { val, num, den }, mapping } = fnNamesAndStToks(undefined, a, [])

    t.is(0, val)
    t.is(0, num)
    t.not(0, den)
    t.deepEqual(mapping, new Map())
  }),
)

test('produces 100% match when comparing empty signatures', t => {
  t.deepEqual(
    { similarity: { val: 1, num: 0, den: 0 }, mapping: new Map() },
    fnNamesAndStToks(undefined, [], []),
  )
})

test(
  'produces 100% match when comparing same signatures',
  check(arbFunctionSignatureArr, (t, a) => {
    const { similarity: { val, num, den }, mapping } = fnNamesAndStToks(undefined, a, a)

    t.is(1, val)
    t.is(num, den)
    t.is(mapping.size, a.length)
    for (let [from, { index: to, prob: { val, num, den } }] of mapping) {
      t.is(from, to)
      t.is(1, val)
      t.is(num, den)
    }
  }),
)
