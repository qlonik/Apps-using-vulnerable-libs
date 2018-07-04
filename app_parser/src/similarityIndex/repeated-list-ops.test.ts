import { test } from 'ava'
import arb from 'jsverify'
import { isEqual, sortBy, identity } from 'lodash/fp'
import { check } from '../_helpers/property-test'
import {
  repeatedOps,
  repeatedOpsFp,
  repeatedDifference,
  repeatedDifferenceFp,
  repeatedIntersection,
  repeatedIntersectionFp,
} from './repeated-list-ops'
import { arraysPair, repeatingArr, repeatingNeArr } from '../_helpers/arbitraries'

const AB = arraysPair(arb.integer, repeatingArr)
const sort = sortBy(identity)

const fn = [
  { name: 'for-loops', fn: repeatedOps(isEqual) },
  { name: 'reduce', fn: repeatedOpsFp(isEqual) },
]
const data: { a: any[]; b: any[]; i: any[]; d: any[] }[] = [
  { a: [1, 1, 2, 2, 3, 4, 5], b: [1, 2, 2, 2, 3, 6, 7], i: [1, 2, 2, 3], d: [1, 4, 5] },
  { a: [], b: [], i: [], d: [] },
  { a: [], b: [1, 1, 2, 3], i: [], d: [] },
  { a: [1, 1, 2, 3], b: [], i: [], d: [1, 1, 2, 3] },
  { a: [1, 1, 1], b: [1], i: [1], d: [1, 1] },
  { a: [1, 1, 1], b: [1, 1, 1], i: [1, 1, 1], d: [] },
  { a: [1], b: [1, 1, 1], i: [1], d: [] },
  { a: [1, 2], b: [1, 1, 1], i: [1], d: [2] },
  { a: [1, 2, 2], b: [1, 1, 1], i: [1], d: [2, 2] },
  { a: [1, 2, 1, 2, 1, 2, 1], b: [1, 1, 1], i: [1, 1, 1], d: [2, 2, 2, 1] },
  { a: [1, 2, 1, 2, 1, 2, 1], b: [1, 1, 1, 2], i: [1, 2, 1, 1], d: [2, 2, 1] },
  { a: [1, 2, 1, 2, 1, 1, 2], b: [1, 1, 1, 2], i: [1, 2, 1, 1], d: [2, 1, 2] },
  {
    a: [[1, 1], [1, 1, 1], [1, 1], [1]],
    b: [[1], [1, 1, 1]],
    i: [[1, 1, 1], [1]],
    d: [[1, 1], [1, 1]],
  },
]

fn.forEach(({ name, fn }) => {
  data.forEach(({ a, b, i, d }, _i) => {
    test(`${name}: op #${_i}`, t => {
      t.deepEqual({ i, d }, fn(a, b))
    })
  })

  test(`${name}: [] inter [] is []`, t => t.deepEqual([], fn([], []).i))
  test(`${name}: [] subtr [] is []`, t => t.deepEqual([], fn([], []).d))

  test(
    `${name}: a inter [] is []`,
    check(repeatingNeArr(arb.number), (t, a) => t.deepEqual([], fn(a, []).i)),
  )
  test(
    `${name}: a subtr [] is a`,
    check(repeatingNeArr(arb.number), (t, a) => t.deepEqual(a, fn(a, []).d)),
  )
  test(
    `${name}: [] subtr a is []`,
    check(repeatingNeArr(arb.number), (t, a) => t.deepEqual([], fn([], a).d)),
  )

  test(
    `${name}: a inter a is a`,
    check(repeatingNeArr(arb.number), (t, a) => t.deepEqual(a, fn(a, a).i)),
  )
  test(
    `${name}: a subtr a is []`,
    check(repeatingNeArr(arb.number), (t, a) => t.deepEqual([], fn(a, a).d)),
  )

  test(
    `${name}: a inter b same using different APIs`,
    check(arraysPair(arb.number, repeatingArr), (t, [a, b]) => {
      const { i, d } = fn(a, b)
      t.deepEqual(i, repeatedIntersection(isEqual, a, b))
      t.deepEqual(i, repeatedIntersectionFp(isEqual, a, b))
      t.deepEqual(d, repeatedDifference(isEqual, a, b))
      t.deepEqual(d, repeatedDifferenceFp(isEqual, a, b))
    }),
  )

  test(
    `${name}: a inter b ~= b inter a`,
    check({ tests: 1000 }, AB, (t, [a, b]) => t.deepEqual(sort(fn(a, b).i), sort(fn(b, a).i))),
  )
  test(
    `${name}: (a inter b) subtr (b inter a) === []`,
    check({ tests: 1000 }, AB, (t, [a, b]) => {
      t.deepEqual([], fn(fn(a, b).i, fn(b, a).i).d)
    }),
  )

  test(
    `${name}: a ~= b || a subtr b ~!= b subtr a`,
    check({ tests: 1000 }, AB, (t, [a, b]) => {
      if (isEqual(sort(a), sort(b))) {
        t.pass()
      } else {
        t.notDeepEqual(sort(fn(a, b).d), sort(fn(b, a).d))
      }
    }),
  )

  test(
    `${name}: (a subtr b) inter (b subtr a) === []`,
    check({ tests: 1000 }, AB, (t, [a, b]) => t.deepEqual([], fn(fn(a, b).d, fn(b, a).d).i)),
  )
})
