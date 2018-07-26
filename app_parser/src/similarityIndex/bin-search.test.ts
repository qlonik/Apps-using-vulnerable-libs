import { test } from 'ava'
import arb from 'jsverify'
import { identity } from 'lodash/fp'
import { repeatingNeArr } from '../_helpers/arbitraries'
import { check } from '../_helpers/property-test'
import { binarySearch, numComp, strComp } from './bin-search'

const tests: [string, arb.Arbitrary<any[]>, arb.Arbitrary<any>, (a: any, b: any) => number][] = [
  ['strings', repeatingNeArr(arb.string).smap(a => a.sort(strComp), identity), arb.string, strComp],
  ['numbers', repeatingNeArr(arb.number).smap(a => a.sort(numComp), identity), arb.number, numComp],
]

for (let [name, a, b, comp] of tests) {
  test(
    `${name} binary search`,
    check(a, b, (t, arr, el) => {
      t.is(arr.findIndex(v => v === el), binarySearch(arr, el, comp))
    }),
  )
}
