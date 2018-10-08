import test from 'ava'
import suite from 'chuhai'
import arb from 'jsverify'
import { isEqual } from 'lodash/fp'
import { arraysPair, repeatingArr } from '../_helpers/arbitraries'
import { check } from '../_helpers/property-test'
import { ComparatorFn, Ops, repeatedOps, repeatedOpsFp } from './repeated-list-ops'

const AB = arraysPair(arb.integer, repeatingArr)

test.serial(
  'repeatedOps vs repeatedOpsFp',
  check({ tests: 2 }, AB, async (t, [a, b]) => {
    /* eslint-disable no-console */
    const origConsoleLog = console.log
    console.log = t.log

    await suite('repeatedOps vs repeatedOpsFp', s => {
      let bench: Ops<number> | null = null

      const repOps = repeatedOps<number>(isEqual as ComparatorFn<any>)
      const repOpsFp = repeatedOpsFp<number>(isEqual as ComparatorFn<any>)

      s.cycle(() => {
        t.not(null, bench)

        bench = null
      })

      s.bench('for-loops', () => {
        bench = repOps(a, b)
      })
      s.bench('reduce', () => {
        bench = repOpsFp(a, b)
      })
    })

    console.log = origConsoleLog
    /* eslint-enable no-console */
  }),
)
