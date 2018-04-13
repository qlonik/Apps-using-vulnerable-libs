import { test } from 'ava'
import { cloneDeep } from 'lodash'
import { arbFunctionSignatureArr } from '../../_helpers/arbitraries'
import { check } from '../../_helpers/property-test'
import { invertMapWithConfidence } from '../set'
import { EXPECTED_MAPPING, EXPECTED_SIMILARITY, LIB_SIG, UNKNOWN_SIG } from './_test-data'
import { v1, v2, v3 } from './fn-st-tokens'

test('v1', t => {
  const { mapping, similarity } = v1(cloneDeep(UNKNOWN_SIG), cloneDeep(LIB_SIG))
  t.deepEqual(EXPECTED_SIMILARITY, similarity)
  t.deepEqual(EXPECTED_MAPPING, mapping)
})

test('v2', t => {
  const { mapping, similarity } = v2(cloneDeep(UNKNOWN_SIG), cloneDeep(LIB_SIG))
  t.deepEqual(EXPECTED_SIMILARITY, similarity)
  t.deepEqual(EXPECTED_MAPPING, mapping)
})

test('v3', t => {
  const { mapping, similarity } = v3(cloneDeep(UNKNOWN_SIG), cloneDeep(LIB_SIG))
  t.deepEqual(EXPECTED_SIMILARITY, similarity)
  t.deepEqual(EXPECTED_MAPPING, mapping)
})

test(
  'v3 is commutative',
  check({ size: 200 }, arbFunctionSignatureArr, arbFunctionSignatureArr, (t, x, y) => {
    const { similarity: sim_xy, mapping: map_xy } = v3(x, y)
    const { similarity: sim_yx, mapping: map_yx } = v3(y, x)
    t.deepEqual(sim_xy, sim_yx)
    t.deepEqual(map_xy, invertMapWithConfidence(map_yx))
  }),
)
