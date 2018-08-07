import { test } from 'ava'
import { cloneDeep } from 'lodash'
import { arbFunctionSignatureArr, arbFunctionSignatureArrPair } from '../../_helpers/arbitraries'
import { check } from '../../_helpers/property-test'
import { jaccardIndex as jaccardIndexFn, similarityIndexToLib } from '../set'
import { LIB_SIG, UNKNOWN_SIG } from './_test-data'
import { librarySimilarityByFunctionNames } from './fn-names'

test('librarySimilarityByFunctionNames', t => {
  const unknownNameSet = new Set(UNKNOWN_SIG.map(s => s.name))
  const libNameSet = new Set(LIB_SIG.map(s => s.name))
  const expected = {
    ourIndex: similarityIndexToLib(libNameSet, unknownNameSet),
    jaccardIndex: jaccardIndexFn(libNameSet, unknownNameSet),
  }
  const result = librarySimilarityByFunctionNames(
    undefined,
    cloneDeep(UNKNOWN_SIG),
    cloneDeep(LIB_SIG),
  )
  t.deepEqual(expected, result)
})

test(
  'calling with array === calling with object',
  check(arbFunctionSignatureArrPair, (t, [u, l]) => {
    t.deepEqual(
      librarySimilarityByFunctionNames(undefined, u, l),
      librarySimilarityByFunctionNames(
        undefined,
        { functionSignature: u },
        { functionSignature: l },
      ),
    )
  }),
)

test(
  'commutative jaccardIndex',
  check(arbFunctionSignatureArrPair, (t, [u, l]) => {
    t.deepEqual(
      librarySimilarityByFunctionNames(undefined, u, l).jaccardIndex,
      librarySimilarityByFunctionNames(undefined, l, u).jaccardIndex,
    )
  }),
)

test(
  'produces 100% match when comparing same signatures',
  check(arbFunctionSignatureArr, (t, u) => {
    const { ourIndex, jaccardIndex } = librarySimilarityByFunctionNames(undefined, u, u)

    t.is(1, ourIndex.val)
    t.is(ourIndex.num, ourIndex.den)
    t.is(1, jaccardIndex.val)
    t.is(jaccardIndex.num, jaccardIndex.den)
  }),
)
