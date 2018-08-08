import { test } from 'ava'
import { uniq } from 'lodash'
import { Logger } from 'pino'
import { arbFunctionSignatureArr, arbFunctionSignatureArrPair } from '../../_helpers/arbitraries'
import { check } from '../../_helpers/property-test'
import { FunctionSignature, FunctionSignatures } from '../../extractStructure'
import { invertMapWithConfidence } from '../set'
import {
  LIB_SIG,
  MAPPING_BY_UNIQUE_NAMES,
  SIMILARITY_BY_UNIQUE_NAMES_JACCARD,
  SIMILARITY_BY_UNIQUE_NAMES_OUR,
  UNKNOWN_SIG,
} from './_test-data'
import {
  librarySimilarityByFunctionNames_jaccardIndex as libSim_jaccard,
  librarySimilarityByFunctionNames_ourIndex as libSim_our,
} from './fn-names'
import { SimMapWithConfidence } from './types'

/* eslint-disable no-unused-vars */
declare const __w: Logger
declare const __x: SimMapWithConfidence
declare const __y: FunctionSignature
declare const __z: FunctionSignatures
/* eslint-enable */

test('librarySimilarityByFunctionNames_ourIndex', t => {
  const { similarity, mapping } = libSim_our(undefined, UNKNOWN_SIG, LIB_SIG)

  t.deepEqual(SIMILARITY_BY_UNIQUE_NAMES_OUR, similarity)
  t.deepEqual(MAPPING_BY_UNIQUE_NAMES, mapping)
})

test('librarySimilarityByFunctionNames_jaccardIndex', t => {
  const { similarity, mapping } = libSim_jaccard(undefined, UNKNOWN_SIG, LIB_SIG)

  t.deepEqual(SIMILARITY_BY_UNIQUE_NAMES_JACCARD, similarity)
  t.deepEqual(MAPPING_BY_UNIQUE_NAMES, mapping)
})

test(
  'libSim_jaccard: commutative',
  check(arbFunctionSignatureArrPair, (t, [u, l]) => {
    const { similarity: sim_ul, mapping: map_ul } = libSim_jaccard(undefined, u, l)
    const { similarity: sim_lu, mapping: map_lu } = libSim_jaccard(undefined, l, u)

    t.deepEqual(sim_ul, sim_lu)
    t.deepEqual(map_ul, invertMapWithConfidence(map_lu))
  }),
)

const tests: (<T extends FunctionSignature[] | FunctionSignatures>(
  l: Logger | undefined,
  a: T,
  b: T,
) => SimMapWithConfidence)[] = [libSim_our, libSim_jaccard]

for (let fn of tests) {
  test(
    `${fn.name}: calling with array === calling with object`,
    check(arbFunctionSignatureArrPair, (t, [u, l]) => {
      t.deepEqual(
        fn(undefined, u, l),
        fn(undefined, { functionSignature: u }, { functionSignature: l }),
      )
    }),
  )

  test(
    `${fn.name}: produces 100% match when comparing same signatures`,
    check(arbFunctionSignatureArr, (t, u) => {
      const { similarity: { val, num, den }, mapping } = fn(undefined, u, u)
      const uniqNames = uniq(u.map(({ name }) => name))

      t.is(1, val)
      t.is(num, den)
      t.is(mapping.size, uniqNames.length)
      for (let [from, { index: to, prob: { val, num, den } }] of mapping) {
        t.is(from, to)
        t.is(1, val)
        t.is(num, den)
      }
    }),
  )
}
