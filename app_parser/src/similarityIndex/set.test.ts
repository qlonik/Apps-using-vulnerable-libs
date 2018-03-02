import { test } from 'ava'
import {
  difference,
  intersection,
  isSubset,
  jaccardIndex,
  jaccardLike,
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
