import { test } from 'ava'
import { cloneDeep } from 'lodash'
import { arbMapWithConfidence, arbPairs } from '../_helpers/arbitraries'
import { check } from '../_helpers/property-test'
import { invertMap, invertMapWithConfidence } from './set'
import { DefiniteMap, probIndex } from './similarity-methods/types'

test('map is inverted and sorted', t => {
  const map = new Map([[1, 2], [2, 3], [3, 1]])
  const inverted = new Map([[1, 3], [2, 1], [3, 2]])
  t.deepEqual(inverted, invertMap(map))
})

test('map with confidence is inverted and sorted', t => {
  const prob = { val: 1, num: 1, den: 1 }
  const map = new Map([
    [1, { index: 2, prob }],
    [2, { index: 3, prob }],
    [3, { index: 1, prob }],
  ]) as DefiniteMap<number, probIndex>
  const expected = new Map([
    [1, { index: 3, prob }],
    [2, { index: 1, prob }],
    [3, { index: 2, prob }],
  ]) as DefiniteMap<number, probIndex>
  t.deepEqual(expected, invertMapWithConfidence(map))
})

test(
  'arb map is inverted',
  check(arbPairs, (t, pairs) => {
    const expected = new Map(
      pairs.map(([k, v]) => [v, k] as [number, number]).sort((p1, p2) => p1[0] - p2[0]),
    )

    t.deepEqual(expected, invertMap(new Map(pairs)))
  }),
)

test(
  'arb map with confidence is inverted',
  check(arbMapWithConfidence, (t, map) => {
    const expected = new Map(
      [...map]
        .map(([key, { index, prob }]) => [index, { index: key, prob }] as [number, probIndex])
        .sort((p1, p2) => p1[0] - p2[0]),
    )

    t.deepEqual(expected, invertMapWithConfidence(map))
  }),
)

test('invertMap() throws when values are not unique', t => {
  const map = new Map([[1, 2], [2, 2], [3, 2]])
  const err = t.throws(() => invertMap(map), { instanceOf: TypeError })
  t.truthy(err.message)
})

test('invertMap() throws when values contain undefined', t => {
  const map = new Map<number, number>([[1, undefined as any]])
  const err = t.throws(() => invertMap(map), { instanceOf: TypeError })
  t.truthy(err.message)
})

test('invertMapWithConfidence() throws when values are not unique', t => {
  const val = { index: 2, prob: { val: 0.5, num: 2, den: 4 } }
  const map = new Map([[1, val], [2, val]]) as DefiniteMap<number, probIndex>
  const err = t.throws(() => invertMapWithConfidence(map), { instanceOf: TypeError })
  t.truthy(err.message)
})

test('invertMapWithConfidence() throws when values contain undefined', t => {
  const map1 = new Map([[1, undefined as any]]) as DefiniteMap<number, probIndex>
  const err1 = t.throws(() => invertMapWithConfidence(map1), { instanceOf: TypeError })
  t.truthy(err1.message)

  const val = { index: undefined as any, prob: { val: 0.5, num: 2, den: 4 } }
  const map2 = new Map([[1, val]]) as DefiniteMap<number, probIndex>
  const err2 = t.throws(() => invertMapWithConfidence(map2), { instanceOf: TypeError })
  t.truthy(err2.message)
})
