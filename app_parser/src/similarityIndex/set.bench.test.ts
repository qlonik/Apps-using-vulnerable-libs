import { test } from 'ava'
import arb from 'jsverify'
import suite from 'chuhai'
import { arraysPair, repeatingArr } from '../_helpers/arbitraries'
import { check } from '../_helpers/property-test'
import { indexValue, jaccardLike, jaccardLikeWithMapping, libPortion } from './set'

const AB = arraysPair(arb.integer(0, 1000), repeatingArr)

test.serial(
  'jaccardLike vs jaccardLikeWithMapping vs libPortion',
  check({ tests: 3, size: 500, rngState: '010123456789abcdef' }, AB, async (t, [a, b]) => {
    /* eslint-disable no-console */
    const origConsoleLog = console.log
    console.log = t.log

    await suite('jaccardLike vs jaccardLikeWithMapping vs libPortion', s => {
      s.set('maxTime', 1)
      s.set('minSamples', 10)

      let bench: indexValue | null = null

      s.cycle(() => {
        if (bench === null) {
          return t.fail()
        }

        t.is('object', typeof bench)
        t.is('number', typeof bench.val)
        t.is('number', typeof bench.num)
        t.is('number', typeof bench.den)

        bench = null
      })

      s.bench('jaccardLikeWithMapping', () => {
        bench = jaccardLikeWithMapping(a, b).similarity
      })
      s.bench('jaccardLike', () => {
        bench = jaccardLike(a, b)
      })
      s.bench('libPortion', () => {
        bench = libPortion(a, b)
      })
    })

    console.log = origConsoleLog
    /* eslint-enable no-console */
  }),
)
