import test from 'ava'
import suite from 'chuhai'
import L from 'lodash/fp'
import R from 'ramda'
import arb from 'jsverify'
import { arbSignatureWithCommentsPair, largeArr } from '../src/_helpers/arbitraries'
import { check } from '../src/_helpers/property-test'
import { jaccardLikeWithMapping } from '../src/similarityIndex/set'

test.serial(
  'lodash/fp.isEqual vs ramda.equals',
  check(
    { tests: 1, size: 1000 /*, rngState: '541236789045abcdef'*/ },
    arbSignatureWithCommentsPair,
    async (t, [a, b]) => {
      /* eslint-disable no-console */
      const origConsoleLog = console.log
      console.log = t.log
      /* eslint-enable no-console */

      // eslint-disable-next-line ava/use-t-well
      await suite(t.title, (s) => {
        s.set('maxTime', 2)
        s.set('minSamples', 10)

        let val: any

        s.cycle(() => {
          t.not(null, val)
          val = null
        })

        s.bench('lodash/fp.isEqual', () => {
          val = L.cloneDeep({ a, b })
        })

        s.bench('ramda.equals', () => {
          val = R.clone({ a, b })
        })
      })

      /* eslint-disable no-console */
      console.log = origConsoleLog
      /* eslint-enable no-console */
    },
  ),
)

test.serial.skip(
  'native vs lodash/fp.findIndex vs ramda.findIndex',
  check(
    { tests: 1, size: 1000 },
    arb.nearray(arb.integer),
    arb.fun(arb.bool),
    async (t, arr, pred) => {
      /* eslint-disable no-console */
      const origConsoleLog = console.log
      console.log = t.log
      /* eslint-enable no-console */

      await suite(t.title, (s) => {
        s.set('maxTime', 2)
        s.set('minSamples', 10)

        for (let el of arr) {
          pred(el)
        }
        let val: any

        s.cycle(() => {
          t.not(null, val)
          val = null
        })

        s.bench('native', () => {
          val = arr.findIndex(pred)
        })

        s.bench('lodash/fp.findIndex', () => {
          val = L.findIndex(pred, arr)
        })

        s.bench('ramda.findIndex', () => {
          val = R.findIndex(pred, arr)
        })
      })

      /* eslint-disable no-console */
      console.log = origConsoleLog
      /* eslint-enable no-console */
    },
  ),
)
