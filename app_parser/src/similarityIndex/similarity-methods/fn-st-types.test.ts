import { test } from 'ava'
import { cloneDeep } from 'lodash'
import { arbFunctionSignatureArr, arbFunctionSignatureArrPair } from '../../_helpers/arbitraries'
import { check } from '../../_helpers/property-test'
import { EXPECTED_SIMILARITY, LIB_SIG, UNKNOWN_SIG } from './_test-data'
import { librarySimilarityByFunctionStatementTypes } from './fn-st-types'

test('librarySimilarityByFunctionStatementTypes', t => {
  const result = librarySimilarityByFunctionStatementTypes(
    cloneDeep(UNKNOWN_SIG),
    cloneDeep(LIB_SIG),
  )
  t.deepEqual(EXPECTED_SIMILARITY, result)
})

test(
  'calling with array === calling with object',
  check(arbFunctionSignatureArrPair, (t, [u, l]) => {
    t.deepEqual(
      librarySimilarityByFunctionStatementTypes(u, l),
      librarySimilarityByFunctionStatementTypes({ functionSignature: u }, { functionSignature: l }),
    )
  }),
)

test(
  'commutative',
  check(arbFunctionSignatureArrPair, (t, [u, l]) => {
    t.deepEqual(
      librarySimilarityByFunctionStatementTypes(u, l),
      librarySimilarityByFunctionStatementTypes(l, u),
    )
  }),
)

test(
  'produces 0% match when comparing with empty signature',
  check(arbFunctionSignatureArr, (t, a) => {
    const similarity = librarySimilarityByFunctionStatementTypes(a, [])

    t.is(0, similarity.val)
    t.is(0, similarity.num)
    t.not(0, similarity.den)
  }),
)

test('produces 0% match when comparing empty signatures', t => {
  t.deepEqual({ val: 0, num: 0, den: 0 }, librarySimilarityByFunctionStatementTypes([], []))
})

test(
  'produces expected match value when comparing same signatures',
  check(arbFunctionSignatureArr, (t, a) => {
    const { val, num, den } = librarySimilarityByFunctionStatementTypes(a, a)

    const nonEmpty = a.filter(({ fnStatementTypes: t }) => t.length > 0)
    const expNum = nonEmpty.length
    const expDen = 2 * a.length - expNum

    t.is(expNum / expDen, val)
    t.is(expNum, num)
    t.is(expDen, den)
  }),
)
