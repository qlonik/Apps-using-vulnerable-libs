import { test } from 'ava'
import { difference } from 'lodash'
import { isSubset } from '../similarityIndex/set'
import { appIds as appIds10 } from './random-10'
import { appIds as appIds100 } from './random-100'
import { appsAnalysed } from './identified-apps'

test('random 10 are all distinct', t => {
  t.is(appIds10.length, new Set(appIds10).size)
})

test('random 100 are all distinct', t => {
  t.is(appIds100.length, new Set(appIds100).size)
})

test('random 10 is a subset of random 100', t => {
  t.true(isSubset(new Set(appIds10), new Set(appIds100)))
})

test.failing.skip('random 10 exist in the list of manually analysed', t => {
  t.deepEqual(difference(appIds10, Object.keys(appsAnalysed)), [])
})

test.failing.skip('random 100 exist in the list of manually analysed', t => {
  t.deepEqual(difference(appIds100, Object.keys(appsAnalysed)), [])
})
