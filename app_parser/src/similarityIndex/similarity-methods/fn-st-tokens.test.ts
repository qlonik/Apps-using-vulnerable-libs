import { test } from 'ava'
import { cloneDeep } from 'lodash'
import { Logger } from 'pino'
import { arbFunctionSignatureArr, arbFunctionSignatureArrPair } from '../../_helpers/arbitraries'
import { check } from '../../_helpers/property-test'
import {
  FunctionSignature, // eslint-disable-line no-unused-vars
  FunctionSignatures, // eslint-disable-line no-unused-vars
} from '../../extractStructure'
import { invertMapWithConfidence } from '../set'
import {
  EXPECTED_MAPPING,
  EXPECTED_SIMILARITY,
  LIB_SIG,
  UNKNOWN_SIG,
  EXPECTED_SIMILARITY_WITH_MAP_QUALITY,
  EXPECTED_MAPPING_FOR_EXACT_MATCHES,
  EXPECTED_SIMILARITY_FOR_EXACT_MATCHES,
  EXPECTED_SIMILARITY_FOR_EXACT_MATCHES_AS_LIB_PORTION,
} from './_test-data'
import { v1, v2, v3, v4, v5, v6 } from './fn-st-tokens'
import {
  SimMapWithConfidence, // eslint-disable-line no-unused-vars
} from './types'

const tests: [
  <T extends FunctionSignature[] | FunctionSignatures>(
    l: Logger | undefined,
    a: T,
    b: T,
  ) => SimMapWithConfidence,
  SimMapWithConfidence
][] = [
  [
    v1,
    {
      similarity: EXPECTED_SIMILARITY,
      mapping: EXPECTED_MAPPING,
    },
  ],
  [
    v2,
    {
      similarity: EXPECTED_SIMILARITY,
      mapping: EXPECTED_MAPPING,
    },
  ],
  [
    v3,
    {
      similarity: EXPECTED_SIMILARITY,
      mapping: EXPECTED_MAPPING,
    },
  ],
  [
    v4,
    {
      similarity: EXPECTED_SIMILARITY_WITH_MAP_QUALITY,
      mapping: EXPECTED_MAPPING,
    },
  ],
  [
    v5,
    {
      similarity: EXPECTED_SIMILARITY_FOR_EXACT_MATCHES,
      mapping: EXPECTED_MAPPING_FOR_EXACT_MATCHES,
    },
  ],
  [
    v6,
    {
      similarity: EXPECTED_SIMILARITY_FOR_EXACT_MATCHES_AS_LIB_PORTION,
      mapping: EXPECTED_MAPPING_FOR_EXACT_MATCHES,
    },
  ],
]

for (let [fn, exp] of tests) {
  test(fn.name, t => {
    t.deepEqual(exp, fn(undefined, cloneDeep(UNKNOWN_SIG), cloneDeep(LIB_SIG)))
  })

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
    `${fn.name}: produces 0% match when comparing empty app signature`,
    check(arbFunctionSignatureArr, (t, a) => {
      const { similarity, mapping } = fn(undefined, [], a)

      t.is(0, similarity.val)
      t.is(0, similarity.num)
      t.not(0, similarity.den)
      t.deepEqual(new Map(), mapping)
    }),
  )

  test(
    `${fn.name}: produces 0% match when comparing empty lib signature`,
    check(arbFunctionSignatureArr, (t, a) => {
      const { similarity, mapping } = fn(undefined, a, [])

      t.is(0, similarity.val)
      t.is(0, similarity.num)
      if (fn.name.startsWith('v6')) {
        t.is(0, similarity.den)
      } else {
        t.not(0, similarity.den)
      }
      t.deepEqual(new Map(), mapping)
    }),
  )

  test(`${fn.name}: produces 100% match when comparing empty signatures`, t => {
    t.deepEqual(
      { similarity: { val: 1, num: 0, den: 0 }, mapping: new Map() },
      fn(undefined, [], []),
    )
  })

  test(
    `${fn.name}: produces 100% match when comparing same signatures`,
    check({ tests: 250 }, arbFunctionSignatureArr, (t, a) => {
      const { similarity: { val, num, den }, mapping } = fn(undefined, a, a)

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
}

test(
  'v3 is commutative',
  check({ size: 1_000_000 }, arbFunctionSignatureArrPair, (t, [x, y]) => {
    const { similarity: sim_xy, mapping: map_xy } = v3(undefined, x, y)
    const { similarity: sim_yx, mapping: map_yx } = v3(undefined, y, x)
    t.deepEqual(sim_xy, sim_yx)
    t.deepEqual(map_xy, invertMapWithConfidence(map_yx))
  }),
)

test(
  'v5 is commutative',
  check({ size: 1_000_000 }, arbFunctionSignatureArrPair, (t, [x, y]) => {
    const { similarity: sim_xy, mapping: map_xy } = v5(undefined, x, y)
    const { similarity: sim_yx, mapping: map_yx } = v5(undefined, y, x)
    t.deepEqual(sim_xy, sim_yx)
    t.deepEqual(map_xy, invertMapWithConfidence(map_yx))
  }),
)
