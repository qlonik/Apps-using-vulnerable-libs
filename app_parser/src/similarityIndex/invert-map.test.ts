import { test } from 'ava'
import arb from 'jsverify'
import { uniqBy, identity, unzip, zip, clone } from 'lodash'
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

const arbPairs: arb.Arbitrary<[number, number][]> = arb
  .nearray(arb.pair(arb.nat, arb.nat))
  .smap(arr => uniqBy(arr, x => x[0]), identity)
  .smap(arr => uniqBy(arr, x => x[1]), identity)
  .smap(arr => clone(arr).sort((p1, p2) => p1[0] - p2[0]), identity)

test(
  'arb map is inverted',
  check(arbPairs, (t, pairs: [number, number][]) => {
    const toCheck = invertMap(new Map(pairs))

    const unzipped = unzip(pairs)
    const inverted = zip(unzipped[1], unzipped[0]) as [number, number][]
    const sorted = inverted.sort((p1, p2) => p1[0] - p2[0])
    const expected = new Map(sorted)

    t.deepEqual(expected, toCheck)
  }),
)

test('throws when values are not unique', t => {
  const map = new Map([[1, 2], [2, 2], [3, 2]])
  const err = t.throws(() => invertMap(map), { instanceOf: TypeError })
  t.truthy(err.message)
})

test('throws when values contain undefined', t => {
  const map = new Map<number, number>([[1, undefined as any]])
  const err = t.throws(() => invertMap(map), { instanceOf: TypeError })
  t.truthy(err.message)
})
