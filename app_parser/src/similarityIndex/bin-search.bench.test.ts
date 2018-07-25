import { test } from 'ava'
import suite from 'chuhai'
import arb from 'jsverify'
import { sortedIndexOf } from 'lodash/fp'
import { check } from '../_helpers/property-test'
import { binarySearch, numComp, strComp } from './bin-search'

test(
  'binSearch vs sortedIndexOf vs findIndex',
  check(
    { tests: 1 },
    arb.nearray(arb.number).smap(ar => ar.sort(numComp), ar => ar),
    arb.number,
    arb.nearray(arb.string).smap(ar => ar.sort(strComp), ar => ar),
    arb.string,
    async (t, nArr, nEl, sArr, sEl) => {
      /* eslint-disable no-console */
      const origConsoleLog = console.log
      console.log = t.log

      await suite(t.title, s => {
        s.set('maxTime', 2)
        s.set('minSamples', 10)

        const nFound = nArr.findIndex(v => v === nEl)
        const sFound = sArr.findIndex(v => v === sEl)
        let nBench: number | null = null
        let sBench: number | null = null

        s.cycle(() => {
          t.not(null, nBench || sBench)
          t.true(nFound === nBench || sFound === sBench)
          nBench = null
          sBench = null
        })

        s.bench('number binSearch', () => {
          nBench = binarySearch(nArr, nEl, numComp)
        })
        s.bench('string binSearch', () => {
          sBench = binarySearch(sArr, sEl, strComp)
        })
        s.bench('number sortedIndexOf', () => {
          nBench = sortedIndexOf(nEl, nArr)
        })
        s.bench('string sortedIndexOf', () => {
          sBench = sortedIndexOf(sEl, sArr)
        })
        s.bench('number findIndex', () => {
          nBench = nArr.findIndex(el => el === nEl)
        })
        s.bench('string findIndex', () => {
          sBench = sArr.findIndex(el => el === sEl)
        })
      })

      console.log = origConsoleLog
      /* eslint-enable no-console */
    },
  ),
)
