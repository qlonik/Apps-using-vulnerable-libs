import { test } from 'ava'
import { cloneDeep } from 'lodash'
import { Logger } from 'pino'
import { arbFunctionSignatureArr, arbFunctionSignatureArrPair } from '../../_helpers/arbitraries'
import { check } from '../../_helpers/property-test'
import { FunctionSignature, FunctionSignatures } from '../../extractStructure'
import { invertMapWithConfidence } from '../set'
import {
  LIB_SIG,
  MAPPING,
  MAPPING_BY_NAMES_TOKENS,
  MAPPING_BY_UNIQUE_NAMES,
  MAPPING_FOR_EXACT_MATCHES,
  SIMILARITY,
  SIMILARITY_BY_UNIQUE_NAMES_JACCARD,
  SIMILARITY_BY_UNIQUE_NAMES_OUR,
  SIMILARITY_FOR_EXACT_MATCHES,
  SIMILARITY_FOR_EXACT_MATCHES_AS_LIB_PORTION,
  SIMILARITY_WITH_MAP_QUALITY,
  UNKNOWN_SIG,
} from './_test-data'
import {
  librarySimilarityByFunctionNames_jaccardIndex as fnNames_jaccard,
  librarySimilarityByFunctionNames_ourIndex as fnNames_our,
  librarySimilarityByFunctionNamesAndStatementTokens,
  librarySimilarityByFunctionStatementTokens as v1,
  librarySimilarityByFunctionStatementTokens_v2 as v2,
  librarySimilarityByFunctionStatementTokens_v3 as v3,
  librarySimilarityByFunctionStatementTokens_v4 as v4,
  librarySimilarityByFunctionStatementTokens_v5 as v5,
  librarySimilarityByFunctionStatementTokens_v6 as v6,
  librarySimilarityByFunctionStatementTypes,
} from './index'
import { SimMapWithConfidence } from './types'

/* eslint-disable no-unused-vars */
declare const __w: Logger
declare const __x: FunctionSignature
declare const __y: FunctionSignatures
declare const __z: SimMapWithConfidence
/* eslint-enable */

const tests: [
  string,
  <T extends FunctionSignature[] | FunctionSignatures>(
    l: Logger | undefined,
    a: T,
    b: T,
  ) => SimMapWithConfidence,
  SimMapWithConfidence
][] = [
  [
    'FnStTokens_v1',
    v1,
    {
      similarity: SIMILARITY,
      mapping: MAPPING,
    },
  ],
  [
    'FnStTokens_v2',
    v2,
    {
      similarity: SIMILARITY,
      mapping: MAPPING,
    },
  ],
  [
    'FnStTokens_v3',
    v3,
    {
      similarity: SIMILARITY,
      mapping: MAPPING,
    },
  ],
  [
    'FnStTokens_v4',
    v4,
    {
      similarity: SIMILARITY_WITH_MAP_QUALITY,
      mapping: MAPPING,
    },
  ],
  [
    'FnStTokens_v5',
    v5,
    {
      similarity: SIMILARITY_FOR_EXACT_MATCHES,
      mapping: MAPPING_FOR_EXACT_MATCHES,
    },
  ],
  [
    'FnStTokens_v6',
    v6,
    {
      similarity: SIMILARITY_FOR_EXACT_MATCHES_AS_LIB_PORTION,
      mapping: MAPPING_FOR_EXACT_MATCHES,
    },
  ],
  [
    'FnStTypes',
    librarySimilarityByFunctionStatementTypes,
    {
      similarity: SIMILARITY,
      mapping: MAPPING,
    },
  ],
  [
    'FnNames_our',
    fnNames_our,
    {
      similarity: SIMILARITY_BY_UNIQUE_NAMES_OUR,
      mapping: MAPPING_BY_UNIQUE_NAMES,
    },
  ],
  [
    'FnNames_jaccard',
    fnNames_jaccard,
    {
      similarity: SIMILARITY_BY_UNIQUE_NAMES_JACCARD,
      mapping: MAPPING_BY_UNIQUE_NAMES,
    },
  ],
  [
    'FnNamesAndStTokens',
    librarySimilarityByFunctionNamesAndStatementTokens,
    {
      similarity: SIMILARITY,
      mapping: MAPPING_BY_NAMES_TOKENS,
    },
  ],
]

for (let [name, fn, exp] of tests) {
  test(name, t => {
    t.deepEqual(exp, fn(undefined, cloneDeep(UNKNOWN_SIG), cloneDeep(LIB_SIG)))
  })

  test(
    `${name}: calling with array === calling with object`,
    check(arbFunctionSignatureArrPair, (t, [u, l]) => {
      t.deepEqual(
        fn(undefined, u, l),
        fn(undefined, { functionSignature: u }, { functionSignature: l }),
      )
    }),
  )

  test(
    `${name}: produces 0% match when comparing empty app signature`,
    check(arbFunctionSignatureArr, (t, a) => {
      const { similarity, mapping } = fn(undefined, [], a)

      t.is(0, similarity.val)
      t.is(0, similarity.num)
      t.not(0, similarity.den)
      t.deepEqual(new Map(), mapping)
    }),
  )

  test(
    `${name}: produces 0% match when comparing empty lib signature`,
    check(arbFunctionSignatureArr, (t, a) => {
      const { similarity, mapping } = fn(undefined, a, [])

      t.is(0, similarity.val)
      t.is(0, similarity.num)
      if (name === 'FnStTokens_v6') {
        t.is(0, similarity.den)
      } else {
        t.not(0, similarity.den)
      }
      t.deepEqual(new Map(), mapping)
    }),
  )

  test(`${name}: produces 100% match when comparing empty signatures`, t => {
    t.deepEqual(
      { similarity: { val: 1, num: 0, den: 0 }, mapping: new Map() },
      fn(undefined, [], []),
    )
  })

  test(
    `${name}: produces 100% match when comparing same signatures`,
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

test(
  'fnNames_jaccard: commutative',
  check({ size: 1_000_000 }, arbFunctionSignatureArrPair, (t, [x, y]) => {
    const { similarity: sim_xy, mapping: map_xy } = fnNames_jaccard(undefined, x, y)
    const { similarity: sim_yx, mapping: map_yx } = fnNames_jaccard(undefined, y, x)
    t.deepEqual(sim_xy, sim_yx)
    t.deepEqual(map_xy, invertMapWithConfidence(map_yx))
  }),
)
