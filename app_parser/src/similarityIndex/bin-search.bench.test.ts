import { test, ExecutionContext } from 'ava'
import suite from 'chuhai'
import arb from 'jsverify'
import { sortedIndexOf } from 'lodash/fp'
import { check } from '../_helpers/property-test'
import { binarySearch, numComp, strComp } from './bin-search'

const arrAndEl = <T extends string | number>(
  comp: (a: T, b: T) => number,
  el: arb.Arbitrary<T>,
): [typeof comp, arb.Arbitrary<T>, arb.Arbitrary<T[]>] => [
  comp,
  el,
  arb.nearray(el).smap(ar => ar.sort(comp), ar => ar),
]

const tests = [
  ['numbers', ...arrAndEl(numComp, arb.number)],
  ['strings', ...arrAndEl(strComp, arb.string)],
]

for (let [name, comp, someArb, someArbArr] of tests) {
  test.serial(
    `${name}: binSearch vs sortedIndexOf vs findIndex`,
    check(
      { tests: 1 },
      someArb,
      someArbArr,
      async (t: ExecutionContext, el: number | string, arr: (typeof el)[]) => {
        /* eslint-disable no-console */
        const origConsoleLog = console.log
        console.log = t.log

        await suite(t.title, s => {
          s.set('maxTime', 2)
          s.set('minSamples', 10)

          let bench: number | null = null

          s.cycle(() => {
            t.is(arr.findIndex(v => v === el), bench)
            bench = null
          })

          s.bench(`${name} binSearch`, () => {
            bench = binarySearch(arr, el, comp as (a: typeof el, b: typeof el) => number)
          })
          s.bench(`${name} sortedIndexOf`, () => {
            bench = sortedIndexOf(el, arr)
          })
          s.bench(`${name} findIndex`, () => {
            bench = arr.findIndex(v => v === el)
          })
        })

        console.log = origConsoleLog
        /* eslint-enable no-console */
      },
    ),
  )
}
