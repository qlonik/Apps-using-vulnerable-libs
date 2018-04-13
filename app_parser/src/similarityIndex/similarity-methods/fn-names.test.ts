import { test } from 'ava'
import { cloneDeep } from 'lodash'
import { arbFunctionSignatureArrPair } from '../../_helpers/arbitraries'
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
  const result = librarySimilarityByFunctionNames(cloneDeep(UNKNOWN_SIG), cloneDeep(LIB_SIG))
  t.deepEqual(expected, result)
})

test(
  'calling with array === calling with object',
  check(arbFunctionSignatureArrPair, (t, [u, l]) => {
    t.deepEqual(
      librarySimilarityByFunctionNames(u, l),
      librarySimilarityByFunctionNames({ functionSignature: u }, { functionSignature: l }),
    )
  }),
)

test(
  'commutative jaccardIndex',
  check(arbFunctionSignatureArrPair, (t, [u, l]) => {
    t.deepEqual(
      librarySimilarityByFunctionNames(u, l).jaccardIndex,
      librarySimilarityByFunctionNames(l, u).jaccardIndex,
    )
  }),
)
