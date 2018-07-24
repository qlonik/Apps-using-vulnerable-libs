import { test } from 'ava'
import { cloneDeep } from 'lodash/fp'
import { shuffleVersions } from './getters'

test('does not mutate incoming array', t => {
  const libs = [
    { name: 'a', version: '1' },
    { name: 'a', version: '2' },
    { name: 'a', version: '3' },
    { name: 'a', version: '4' },
    { name: 'a', version: '5' },
    { name: 'b', version: '1' },
    { name: 'b', version: '2' },
    { name: 'b', version: '3' },
  ]
  const deepCopy = cloneDeep(libs)

  shuffleVersions(deepCopy)

  t.deepEqual(libs, deepCopy)
})

test('shuffles versions of one lib', t => {
  t.deepEqual(
    [
      { name: 'a', version: '5' },
      { name: 'a', version: '4' },
      { name: 'a', version: '6' },
      { name: 'a', version: '3' },
      { name: 'a', version: '2' },
      { name: 'a', version: '1' },
    ],
    shuffleVersions([
      { name: 'a', version: '1' },
      { name: 'a', version: '2' },
      { name: 'a', version: '3' },
      { name: 'a', version: '4' },
      { name: 'a', version: '5' },
      { name: 'a', version: '6' },
    ]),
  )

  t.deepEqual(
    [
      { name: 'a', version: '10' },
      { name: 'a', version: '9' },
      { name: 'a', version: '11' },
      { name: 'a', version: '8' },
      { name: 'a', version: '12' },
      { name: 'a', version: '7' },
      { name: 'a', version: '6' },
      { name: 'a', version: '5' },
      { name: 'a', version: '4' },
      { name: 'a', version: '3' },
      { name: 'a', version: '2' },
      { name: 'a', version: '1' },
    ],
    shuffleVersions([
      { name: 'a', version: '1' },
      { name: 'a', version: '2' },
      { name: 'a', version: '3' },
      { name: 'a', version: '4' },
      { name: 'a', version: '5' },
      { name: 'a', version: '6' },
      { name: 'a', version: '7' },
      { name: 'a', version: '8' },
      { name: 'a', version: '9' },
      { name: 'a', version: '10' },
      { name: 'a', version: '11' },
      { name: 'a', version: '12' },
    ]),
  )
})
test('shuffles versions of few libs', t => {
  t.deepEqual(
    [
      { name: 'a', version: '6' },
      { name: 'a', version: '5' },
      { name: 'a', version: '7' },
      { name: 'a', version: '4' },
      { name: 'a', version: '3' },
      { name: 'a', version: '2' },
      { name: 'a', version: '1' },
      { name: 'b', version: '2' },
      { name: 'b', version: '1' },
      { name: 'b', version: '3' },
      { name: 'c', version: '3' },
      { name: 'c', version: '2' },
      { name: 'c', version: '4' },
      { name: 'c', version: '1' },
    ],
    shuffleVersions([
      { name: 'a', version: '1' },
      { name: 'a', version: '2' },
      { name: 'a', version: '3' },
      { name: 'a', version: '4' },
      { name: 'a', version: '5' },
      { name: 'a', version: '6' },
      { name: 'a', version: '7' },
      { name: 'b', version: '1' },
      { name: 'b', version: '2' },
      { name: 'b', version: '3' },
      { name: 'c', version: '1' },
      { name: 'c', version: '2' },
      { name: 'c', version: '3' },
      { name: 'c', version: '4' },
    ]),
  )
})
test('preserves additional data in the object', t => {
  t.deepEqual(
    [
      { name: 'a', version: '5' },
      { name: 'a', version: '4' },
      { name: 'a', version: '6' },
      { name: 'a', version: '3' },
      { name: 'a', version: '2', data: false },
      { name: 'a', version: '1', data: true },
    ],
    shuffleVersions([
      { name: 'a', version: '1', data: true },
      { name: 'a', version: '2', data: false },
      { name: 'a', version: '3' },
      { name: 'a', version: '4' },
      { name: 'a', version: '5' },
      { name: 'a', version: '6' },
    ]),
  )
})
