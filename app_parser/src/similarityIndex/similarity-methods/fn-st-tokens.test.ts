import { test } from 'ava'
import { cloneDeep } from 'lodash'
import { arbFunctionSignatureArr, arbFunctionSignatureArrPair } from '../../_helpers/arbitraries'
import { check } from '../../_helpers/property-test'
import { invertMapWithConfidence } from '../set'
import {
  EXPECTED_MAPPING,
  EXPECTED_SIMILARITY,
  LIB_SIG,
  UNKNOWN_SIG,
  EXPECTED_SIMILARITY_WITH_MAP_QUALITY,
  EXPECTED_MAPPING_FOR_EXACT_MATCHES,
  EXPECTED_SIMILARITY_FOR_EXACT_MATCHES,
} from './_test-data'
import { v1, v2, v3, v4, v5 } from './fn-st-tokens'

test('v1', t => {
  const { mapping, similarity } = v1(cloneDeep(UNKNOWN_SIG), cloneDeep(LIB_SIG))
  t.deepEqual(EXPECTED_SIMILARITY, similarity)
  t.deepEqual(EXPECTED_MAPPING, mapping)
})

test(
  'v1: calling with array === calling with object',
  check(arbFunctionSignatureArrPair, (t, [u, l]) => {
    t.deepEqual(v1(u, l), v1({ functionSignature: u }, { functionSignature: l }))
  }),
)

test(
  'v1: produces 0% match when comparing with empty signature',
  check(arbFunctionSignatureArr, (t, a) => {
    const { similarity, mapping } = v1(a, [])

    t.is(0, similarity.val)
    t.is(0, similarity.num)
    t.not(0, similarity.den)
    t.deepEqual(new Map(), mapping)
  }),
)

test('v1: produces 100% match when comparing empty signatures', t => {
  t.deepEqual({ similarity: { val: 1, num: 0, den: 0 }, mapping: new Map() }, v1([], []))
})

test(
  'v1: produces 100% match when comparing same signatures',
  check({ tests: 250 }, arbFunctionSignatureArr, (t, a) => {
    const { similarity: { val, num, den }, mapping } = v1(a, a)

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

test('v2', t => {
  const { mapping, similarity } = v2(cloneDeep(UNKNOWN_SIG), cloneDeep(LIB_SIG))
  t.deepEqual(EXPECTED_SIMILARITY, similarity)
  t.deepEqual(EXPECTED_MAPPING, mapping)
})

test(
  'v2: calling with array === calling with object',
  check(arbFunctionSignatureArrPair, (t, [u, l]) => {
    t.deepEqual(v2(u, l), v2({ functionSignature: u }, { functionSignature: l }))
  }),
)

test(
  'v2: produces 0% match when comparing with empty signature',
  check(arbFunctionSignatureArr, (t, a) => {
    const { similarity, mapping } = v2(a, [])

    t.is(0, similarity.val)
    t.is(0, similarity.num)
    t.not(0, similarity.den)
    t.deepEqual(new Map(), mapping)
  }),
)

test('v2: produces 100% match when comparing empty signatures', t => {
  t.deepEqual({ similarity: { val: 1, num: 0, den: 0 }, mapping: new Map() }, v2([], []))
})

test(
  'v2: produces 100% match when comparing same signatures',
  check({ tests: 250 }, arbFunctionSignatureArr, (t, a) => {
    const { similarity: { val, num, den }, mapping } = v2(a, a)

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

test('v3', t => {
  const { mapping, similarity } = v3(cloneDeep(UNKNOWN_SIG), cloneDeep(LIB_SIG))
  t.deepEqual(EXPECTED_SIMILARITY, similarity)
  t.deepEqual(EXPECTED_MAPPING, mapping)
})

test(
  'v3: calling with array === calling with object',
  check(arbFunctionSignatureArrPair, (t, [u, l]) => {
    t.deepEqual(v3(u, l), v3({ functionSignature: u }, { functionSignature: l }))
  }),
)

test(
  'v3 is commutative',
  check({ size: 200 }, arbFunctionSignatureArrPair, (t, [x, y]) => {
    const { similarity: sim_xy, mapping: map_xy } = v3(x, y)
    const { similarity: sim_yx, mapping: map_yx } = v3(y, x)
    t.deepEqual(sim_xy, sim_yx)
    t.deepEqual(map_xy, invertMapWithConfidence(map_yx))
  }),
)

test(
  'v3: produces 0% match when comparing with empty signature',
  check(arbFunctionSignatureArr, (t, a) => {
    const { similarity, mapping } = v3(a, [])

    t.is(0, similarity.val)
    t.is(0, similarity.num)
    t.not(0, similarity.den)
    t.deepEqual(new Map(), mapping)
  }),
)

test('v3: produces 100% match when comparing empty signatures', t => {
  t.deepEqual({ similarity: { val: 1, num: 0, den: 0 }, mapping: new Map() }, v3([], []))
})

test(
  'v3: produces 100% match when comparing same signatures',
  check({ tests: 250 }, arbFunctionSignatureArr, (t, a) => {
    const { similarity: { val, num, den }, mapping } = v3(a, a)

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

test('v4', t => {
  const { mapping, similarity } = v4(cloneDeep(UNKNOWN_SIG), cloneDeep(LIB_SIG))
  t.deepEqual(EXPECTED_SIMILARITY_WITH_MAP_QUALITY, similarity)
  t.deepEqual(EXPECTED_MAPPING, mapping)
})

test(
  'v4: calling with array === calling with object',
  check(arbFunctionSignatureArrPair, (t, [u, l]) => {
    t.deepEqual(v4(u, l), v4({ functionSignature: u }, { functionSignature: l }))
  }),
)

test(
  'v4: produces 0% match when comparing with empty signature',
  check(arbFunctionSignatureArr, (t, a) => {
    const { similarity, mapping } = v4(a, [])

    t.is(0, similarity.val)
    t.is(0, similarity.num)
    t.not(0, similarity.den)
    t.deepEqual(new Map(), mapping)
  }),
)

test('v4: produces 100% match when comparing empty signatures', t => {
  t.deepEqual({ similarity: { val: 1, num: 0, den: 0 }, mapping: new Map() }, v4([], []))
})

test(
  'v4: produces 100% match when comparing same signatures',
  check({ tests: 250 }, arbFunctionSignatureArr, (t, a) => {
    const { similarity: { val, num, den }, mapping } = v4(a, a)

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

test('v5', t => {
  const { mapping, similarity } = v5(cloneDeep(UNKNOWN_SIG), cloneDeep(LIB_SIG))
  t.deepEqual(EXPECTED_SIMILARITY_FOR_EXACT_MATCHES, similarity)
  t.deepEqual(EXPECTED_MAPPING_FOR_EXACT_MATCHES, mapping)
})

test(
  'v5: calling with array === calling with object',
  check(arbFunctionSignatureArrPair, (t, [u, l]) => {
    t.deepEqual(v5(u, l), v5({ functionSignature: u }, { functionSignature: l }))
  }),
)

test(
  'v5: produces 0% match when comparing with empty signature',
  check(arbFunctionSignatureArr, (t, a) => {
    const { similarity, mapping } = v5(a, [])

    t.is(0, similarity.val)
    t.is(0, similarity.num)
    t.not(0, similarity.den)
    t.deepEqual(new Map(), mapping)
  }),
)

test('v5: produces 100% match when comparing empty signatures', t => {
  t.deepEqual({ similarity: { val: 1, num: 0, den: 0 }, mapping: new Map() }, v5([], []))
})

test(
  'v5: produces 100% match when comparing same signatures',
  check({ tests: 250 }, arbFunctionSignatureArr, (t, a) => {
    const { similarity: { val, num, den }, mapping } = v5(a, a)

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
