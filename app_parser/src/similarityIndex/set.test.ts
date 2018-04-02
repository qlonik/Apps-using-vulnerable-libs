import { test } from 'ava'
import {
  difference,
  intersection,
  isSubset,
  jaccardIndex,
  jaccardLike,
  jaccardLikeWithMapping,
  similarityIndexToLib,
  union,
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

test('jaccardLike is commutative', t => {
  const a = [1, 2, 3, 4, 1, 2, 3, 1, 5, 6, 4, 4, 6, 7, 8, 9, 0, 4, 3, 2, 9, 2, 3, 4]
  const b = [5, 3, 2, 2, 4, 6, 7, 8, 9, 5, 3, 2, 1, 4, 5, 7, 8, 9, 3, 2, 1, 3]

  t.deepEqual(jaccardLike(a, b), jaccardLike(b, a))
})

test('jaccardLikeWithMapping and jaccardLike produce the same value', t => {
  const a = [1, 2, 3, 4, 1, 2, 3, 1, 5, 6, 4, 4, 6, 7, 8, 9, 0, 4, 3, 2, 9, 2, 3, 4]
  const b = [5, 3, 2, 2, 4, 6, 7, 8, 9, 5, 3, 2, 1, 4, 5, 7, 8, 9, 3, 2, 1, 3]
  const { similarity } = jaccardLikeWithMapping(a, b)
  t.deepEqual(jaccardLike(a, b), similarity)
})

test('jaccardLikeWithMapping is commutative', t => {
  const a = [1, 2, 3, 4, 1, 2, 3, 1, 5, 6, 4, 4, 6, 7, 8, 9, 0, 4, 3, 2, 9, 2, 3, 4]
  const b = [5, 3, 2, 2, 4, 6, 7, 8, 9, 5, 3, 2, 1, 4, 5, 7, 8, 9, 3, 2, 1, 3]
  t.deepEqual(jaccardLikeWithMapping(a, b).similarity, jaccardLikeWithMapping(b, a).similarity)
})
