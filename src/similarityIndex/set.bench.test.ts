import test from 'ava'
import suite from 'chuhai'
import arb from 'jsverify'
import { identity, shuffle } from 'lodash/fp'
import { arraysPair, repeatingArr } from '../_helpers/arbitraries'
import { check } from '../_helpers/property-test'
import { numComp, strComp } from './bin-search'
import {
  indexValue,
  jaccardLike,
  jaccardLikeNumbers,
  jaccardLikeStrings,
  jaccardLikeWithMapping,
  libPortion,
  libPortionIndexes,
} from './set'

const sAB = arraysPair(arb.nestring, repeatingArr).smap<[string[], string[]]>(
  ([a, b]) => [a.sort(strComp), b.sort(strComp)],
  identity,
)
const nAB = arraysPair(arb.integer(0, 1000), repeatingArr).smap<[number[], number[]]>(
  ([a, b]) => [a.sort(numComp), b.sort(numComp)],
  identity,
)

type testTuple<T> = [string, arb.Arbitrary<[T[], T[]]>, (a: T[], b: T[]) => indexValue]
const tests: testTuple<any>[] = [
  ['Strings', sAB, jaccardLikeStrings] as testTuple<string>,
  ['Numbers', nAB, jaccardLikeNumbers] as testTuple<number>,
]

for (let [name, arbitrary, fn] of tests) {
  test.serial(
    `${name}: all fns producing indexValue`,
    check({ tests: 1, size: 500 }, arbitrary, async (t, [a, b]) => {
      /* eslint-disable no-console */
      const origConsoleLog = console.log
      console.log = t.log

      const aSh = shuffle(a)
      const bSh = shuffle(b)

      await suite(t.title, s => {
        s.set('maxTime', 1)
        s.set('minSamples', 10)

        let bench: indexValue | null = null

        s.cycle(() => {
          if (bench !== null) {
            t.deepEqual(jaccardLike(a, b), bench)
          } else if (bench === null) {
            t.pass()
          }
          bench = null
        })

        s.bench('jaccardLike shuffled', () => {
          bench = jaccardLike(aSh, bSh)
        })
        s.bench('jaccardLike sorted', () => {
          bench = jaccardLike(a, b)
        })
        s.bench('jaccardLikeWithMapping shuffled', () => {
          bench = jaccardLikeWithMapping(aSh, bSh).similarity
        })
        s.bench('jaccardLikeWithMapping sorted', () => {
          bench = jaccardLikeWithMapping(a, b).similarity
        })
        s.bench('libPortion shuffled', () => {
          libPortion(aSh, bSh)
        })
        s.bench('libPortion sorted', () => {
          libPortion(a, b)
        })
        s.bench(`jaccardLike${name} shuffled`, () => {
          bench = fn(aSh, bSh)
        })
        s.bench(`jaccardLike${name} sorted`, () => {
          bench = fn(a, b)
        })

        if (name === 'Numbers') {
          s.bench('libPortionIndexes shuffled', () => {
            libPortionIndexes(aSh, bSh)
          })
          s.bench('libPortionIndexes sorted', () => {
            libPortionIndexes(a, b)
          })
        }
      })

      console.log = origConsoleLog
      /* eslint-enable no-console */
    }),
  )
}
