import { test } from 'ava'
import { Fraction } from 'fraction.js'
import arb from 'jsverify'
import { cloneDeep, intersection as LIntersection } from 'lodash'
import { isEqual } from 'lodash/fp'
import { arbMapWithConfidence, arraysPair } from '../_helpers/arbitraries'
import { check } from '../_helpers/property-test'
import { IndexValueToFraction } from './fraction'
import { repeatedIntersection } from './repeated-list-ops'
import {
  difference,
  divByZeroAware,
  intersection,
  invertMap,
  isSubset,
  jaccardIndex,
  jaccardLike,
  jaccardLikeWithMapping,
  libPortion,
  similarityIndexToLib,
  union,
  weightedMapIndex,
} from './set'

test('isSubset', t => {
  t.true(isSubset(new Set([1, 2, 3]), new Set([1, 2, 3, 4, 5])))
  t.false(isSubset(new Set([1, 2, 3]), new Set([2, 3, 4])))
})

test('intersection', t => {
  t.deepEqual(new Set([2, 3, 4]), intersection(new Set([1, 2, 3, 4]), new Set([2, 3, 4, 5])))
})

test('union', t => {
  t.deepEqual(new Set([1, 2, 3, 4, 5]), union(new Set([1, 2, 3, 4]), new Set([3, 4, 5])))
})

test('difference', t => {
  t.deepEqual(new Set([1, 2]), difference(new Set([1, 2, 3, 4]), new Set([3, 4, 5])))
})

test('jaccard index', t => {
  const a = new Set([1, 2, 3])
  const b = new Set([2, 3, 4])
  const ex = { val: 0.5, num: 2, den: 4 }

  t.deepEqual(ex, jaccardIndex(a, b))
})

test('jaccard index with repeating', t => {
  const a = new Set([1, 2, 2, 3, 3])
  const b = new Set([2, 2, 3, 4])
  const ex = { val: 0.5, num: 2, den: 4 }

  t.deepEqual(ex, jaccardIndex(a, b))
})

test('similarity index to lib', t => {
  const a = new Set([1, 2, 3])
  const b = new Set([2, 3, 4, 5])
  const ex = { val: 0.5, num: 2, den: 4 }

  t.deepEqual(ex, similarityIndexToLib(b, a))
})

test('similarity index to lib with repeating', t => {
  const a = new Set([1, 2, 2, 3, 3])
  const b = new Set([2, 2, 3, 4, 5])
  const ex = { val: 0.5, num: 2, den: 4 }

  t.deepEqual(ex, similarityIndexToLib(b, a))
})

test('jaccard like for sorted arrays', t => {
  const a = [1, 2, 3]
  const b = [2, 3, 4]
  const ex = { val: 0.5, num: 2, den: 4 }

  t.deepEqual(ex, jaccardLike(a, b))
})

test('jaccard like for sorted arrays with repeating', t => {
  const a = [1, 2, 2, 3, 3]
  const b = [2, 2, 3, 4]
  const ex = { val: 0.5, num: 3, den: 6 }

  t.deepEqual(ex, jaccardLike(a, b))
})

test('jaccard like works for iterable', t => {
  const a = new Set([1, 2, 3, 4])
  const b = new Set([2, 3, 4, 5])
  const ex = { val: 0.6, num: 3, den: 5 }

  t.deepEqual(ex, jaccardLike(a, b))
})

test('jaccard like works for mix of array and iterable', t => {
  const a = [1, 2, 2, 3, 3, 4]
  const b = new Set([1, 2, 3])
  const ex = { val: 0.5, num: 3, den: 6 }

  t.deepEqual(ex, jaccardLike(a, b))
})

test('jaccard like works for unsorted arrays', t => {
  const a = [5, 3, 2, 1, 4, 1]
  const b = [1, 2, 6, 3, 4, 8]
  const ex = { val: 0.5, num: 4, den: 8 }

  t.deepEqual(ex, jaccardLike(a, b))
})

test(
  'jaccardLike produces expected values',
  check(arraysPair(arb.number), (t, [a, b]) => {
    const num = LIntersection(a, b).length
    const den = a.length + b.length - num
    const val = divByZeroAware(num, den)
    t.deepEqual({ val, num, den }, jaccardLike(a, b))
  }),
)

test(
  'jaccardLike is commutative',
  check(arraysPair(arb.number), (t, [a, b]) => {
    t.deepEqual(jaccardLike(a, b), jaccardLike(b, a))
  }),
)

test(
  'jaccardLikeWithMapping and jaccardLike produce the same value',
  check(arraysPair(arb.number), (t, [a, b]) => {
    t.deepEqual(jaccardLike(a, b), jaccardLikeWithMapping(a, b).similarity)
  }),
)

test(
  'jaccardLikeWithMapping is commutative',
  check(arraysPair(arb.number), (t, [a, b]) => {
    const { similarity: sim_ab, mapping: map_ab } = jaccardLikeWithMapping(a, b)
    const { similarity: sim_ba, mapping: map_ba } = jaccardLikeWithMapping(b, a)

    t.deepEqual(sim_ab, sim_ba)
    t.deepEqual(map_ab, invertMap(map_ba))
  }),
)

test(
  'jaccardLikeWithMapping produces expected values',
  check(arraysPair(arb.number), (t, [a, b]) => {
    const num = LIntersection(a, b).length
    const den = a.length + b.length - num
    const val = divByZeroAware(num, den)
    t.deepEqual({ val, num, den }, jaccardLikeWithMapping(a, b).similarity)
  }),
)

test('jaccardLikeWithMapping produces expected mapping', t => {
  const a = [1, 2, 3, 4, 5]
  const b = [2, 3, 1, 5, 6]
  const mapping = new Map([[0, 2], [1, 0], [2, 1], [4, 3]])
  t.deepEqual(mapping, jaccardLikeWithMapping(a, b).mapping)
})

test(
  'libPortion produces expected values',
  check({ tests: 500 }, arraysPair(arb.number), (t, [a, b]) => {
    const num = LIntersection(a, b).length
    const den = b.length
    const val = divByZeroAware(num, den)
    t.deepEqual({ val, num, den }, libPortion(a, b))
  }),
)

test(
  'libPortion produces expected values for complex objects',
  check({ tests: 500 }, arraysPair(arb.json), (t, [a, b]) => {
    const num = repeatedIntersection(isEqual, a, b).length
    const den = b.length
    const val = divByZeroAware(num, den)
    t.deepEqual({ val, num, den }, libPortion(a, b))
  }),
)

test(
  'libPortion produces 100% for same values',
  check({ tests: 500 }, arb.array(arb.number), (t, a) => {
    t.deepEqual({ val: 1, num: a.length, den: a.length }, libPortion(a, a))
  }),
)

test(
  'libPortion produces 100% when comparing with empty lib',
  check(arb.nearray(arb.number), (t, a) => {
    t.deepEqual({ val: 1, num: 0, den: 0 }, libPortion(a, []))
  }),
)

test(
  'libPortion is curried',
  check(arraysPair(arb.number), (t, [a, b]) => {
    t.deepEqual(libPortion(a, b), libPortion(a)(b))
  }),
)

test(
  'jaccardIndex() does not mutate original data',
  check({ tests: 5 }, arraysPair(arb.number), (t, [a, b]) => {
    const aClone = new Set(cloneDeep(a))
    const bClone = new Set(cloneDeep(b))

    jaccardIndex(aClone, bClone)

    t.deepEqual(new Set(a), aClone)
    t.deepEqual(new Set(b), bClone)
  }),
)

test(
  'similarityIndexToLib() does not mutate original data',
  check({ tests: 5 }, arraysPair(arb.number), (t, [a, b]) => {
    const aClone = new Set(cloneDeep(a))
    const bClone = new Set(cloneDeep(b))

    similarityIndexToLib(aClone, bClone)

    t.deepEqual(new Set(a), aClone)
    t.deepEqual(new Set(b), bClone)
  }),
)

test(
  'jaccardLike() does not mutate original data',
  check({ tests: 5 }, arraysPair(arb.number), (t, [a, b]) => {
    const aClone = cloneDeep(a)
    const bClone = cloneDeep(b)

    jaccardLike(aClone, bClone)

    t.deepEqual(a, aClone)
    t.deepEqual(b, bClone)
  }),
)

test(
  'jaccardLikeWithMapping() does not mutate original data',
  check({ tests: 5 }, arraysPair(arb.number), (t, [a, b]) => {
    const aClone = cloneDeep(a)
    const bClone = cloneDeep(b)

    jaccardLikeWithMapping(aClone, bClone)

    t.deepEqual(a, aClone)
    t.deepEqual(b, bClone)
  }),
)

test(
  'libPortion() does not mutate original data',
  check({ tests: 5 }, arraysPair(arb.number), (t, [a, b]) => {
    const aClone = cloneDeep(a)
    const bClone = cloneDeep(b)

    libPortion(aClone, bClone)

    t.deepEqual(a, aClone)
    t.deepEqual(b, bClone)
  }),
)

test(
  'weightedMapIndex',
  check(arbMapWithConfidence, (t, m) => {
    const { s, t: tot } = [...m.values()].reduce(
      ({ s, t }, { prob }) => ({ s: s.add(IndexValueToFraction(prob)), t: t + 1 }),
      { s: new Fraction(0), t: 0 },
    )
    const expected = s.div(tot)

    t.deepEqual(expected, weightedMapIndex(m))
  }),
)
