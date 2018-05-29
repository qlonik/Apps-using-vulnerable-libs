import { test } from 'ava'
import { cloneDeep, partition, last } from 'lodash'
import { arbFunctionSignatureArr, arbFunctionSignatureArrPair } from '../../_helpers/arbitraries'
import { check } from '../../_helpers/property-test'
import { fnNamesSplit } from '../../extractStructure'
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

test('produces 0% match when comparing empty signatures', t => {
  t.deepEqual(
    { val: 0, num: 0, den: 0 },
    librarySimilarityByFunctionNamesAndStatementTokens([], []),
  )
})

test(
  'produces expected match value when comparing same signatures',
  check({ tests: 500, rngState: '8af8e71a0bd653c924' }, arbFunctionSignatureArr, (t, a) => {
    const { val, num, den } = librarySimilarityByFunctionNamesAndStatementTokens(a, a)

    const [anon, named] = partition(a, s => last(fnNamesSplit(s.name)) === '[anonymous]')
    const nonEmpty = anon.filter(({ fnStatementTokens: t }) => t.length > 0)
    const expNum = nonEmpty.length + named.length
    const expDen = 2 * a.length - expNum

    t.is(expNum / expDen, val)
    t.is(expNum, num)
    t.is(expDen, den)
  }),
)
