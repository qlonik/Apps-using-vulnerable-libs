import test from 'ava'
import arb from 'jsverify'
import R from 'ramda'
import { repeatingNeArr } from '../_helpers/arbitraries'
import { check } from '../_helpers/property-test'
import { binarySearch, numComp, strComp } from './bin-search'

const tests: [string, arb.Arbitrary<any[]>, arb.Arbitrary<any>, (a: any, b: any) => number][] = [
  ['strings', repeatingNeArr(arb.string).smap(R.sort(strComp), R.identity), arb.string, strComp],
  ['numbers', repeatingNeArr(arb.number).smap(R.sort(numComp), R.identity), arb.number, numComp],
]

for (let [name, a, b, comp] of tests) {
  test(
    `${name} binary search`,
    check(a, b, (t, arr, el) => {
      t.is(arr.indexOf(el), binarySearch(arr, el, comp))
      t.is(arr.lastIndexOf(el), binarySearch(arr, el, comp, false))
    }),
  )

  test(
    `${name} bin search does not find in empty array`,
    check(b, (t, el) => {
      t.is(-1, binarySearch([], el, comp))
    }),
  )
}

test(`Numbers bin search for smallest el`, t => {
  const arr = [3, 3, 4, 4, 5, 5]
  const el = 2
  t.is(-1, binarySearch(arr, el, numComp, true))
  t.is(-1, binarySearch(arr, el, numComp, false))
})

test(`Numbers bin search for largest el`, t => {
  const arr = [3, 3, 4, 4, 5, 5]
  const el = 6
  t.is(-1, binarySearch(arr, el, numComp, true))
  t.is(-1, binarySearch(arr, el, numComp, false))
})

test('Numbers bin search for middle el', t => {
  const arr = [2, 2, 4, 4, 5, 5]
  const el = 3
  t.is(-1, binarySearch(arr, el, numComp, true))
  t.is(-1, binarySearch(arr, el, numComp, false))
})
