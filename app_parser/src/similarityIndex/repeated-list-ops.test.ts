import test from 'ava'
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
const data: { a: any[]; b: any[]; i: any[]; d: any[]; rd: any[] }[] = [
  {
    a: [1, 1, 2, 2, 3, 4, 5],
    b: [1, 2, 2, 2, 3, 6, 7],
    i: [1, 2, 2, 3],
    d: [1, 4, 5],
    rd: [2, 6, 7],
  },
  { a: [], b: [], i: [], d: [], rd: [] },
  { a: [], b: [1, 1, 2, 3], i: [], d: [], rd: [1, 1, 2, 3] },
  { a: [1, 1, 2, 3], b: [], i: [], d: [1, 1, 2, 3], rd: [] },
  { a: [1, 1, 1], b: [1], i: [1], d: [1, 1], rd: [] },
  { a: [1, 1, 1], b: [1, 1, 1], i: [1, 1, 1], d: [], rd: [] },
  { a: [1], b: [1, 1, 1], i: [1], d: [], rd: [1, 1] },
  { a: [1, 2], b: [1, 1, 1], i: [1], d: [2], rd: [1, 1] },
  { a: [1, 2, 2], b: [1, 1, 1], i: [1], d: [2, 2], rd: [1, 1] },
  { a: [1, 2, 1, 2, 1, 2, 1], b: [1, 1, 1], i: [1, 1, 1], d: [2, 2, 2, 1], rd: [] },
  { a: [1, 2, 1, 2, 1, 2, 1], b: [1, 1, 1, 2], i: [1, 2, 1, 1], d: [2, 2, 1], rd: [] },
  { a: [1, 2, 1, 2, 1, 1, 2], b: [1, 1, 1, 2], i: [1, 2, 1, 1], d: [2, 1, 2], rd: [] },
  {
    a: [[1, 1], [1, 1, 1], [1, 1], [1]],
    b: [[1], [1, 1, 1]],
    i: [[1, 1, 1], [1]],
    d: [[1, 1], [1, 1]],
    rd: [],
  },
]

fn.forEach(({ name, fn }) => {
  data.forEach(({ a, b, i, d, rd }, _i) => {
    test(`${name}: op #${_i}`, t => {
      t.deepEqual({ i, d, rd }, fn(a, b))
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
    `${name}: b rSubt a === a subtr b`,
    check({ tests: 1000 }, AB, (t, [a, b]) => t.deepEqual(fn(b, a).rd, fn(a, b).d)),
  )

  test(
    `${name}: a rSubt b === b subtr a`,
    check({ tests: 1000 }, AB, (t, [a, b]) => t.deepEqual(fn(a, b).rd, fn(b, a).d)),
  )

  test(
    `${name}: (a subtr b) inter (b subtr a) === []`,
    check({ tests: 1000 }, AB, (t, [a, b]) => t.deepEqual([], fn(fn(a, b).d, fn(b, a).d).i)),
  )

  test(
    `${name}: a inter b ~= a subtr (a subtr b) ~= b subtr (a rSubt b)`,
    check({ tests: 1000 }, AB, (t, [a, b]) => {
      const { i, d, rd } = fn(a, b)

      const i1 = sort(i)
      const i2 = sort(fn(a, d).d)
      const i3 = sort(fn(b, rd).d)

      t.deepEqual(i1, i2)
      t.deepEqual(i1, i3)
      t.deepEqual(i2, i3)
    }),
  )

  test(
    `${name}: union: (a + b) subtr (a inter b) ~= b + (a subtr b) ~= a + (a rSubt b)`,
    check({ tests: 1000 }, AB, (t, [a, b]) => {
      const { i, d, rd } = fn(a, b)

      const u1 = sort(fn(a.concat(b), i).d)
      const u2 = sort(b.concat(d))
      const u3 = sort(a.concat(rd))

      t.deepEqual(u1, u2)
      t.deepEqual(u1, u3)
      t.deepEqual(u2, u3)
    }),
  )
})
