import { test } from 'ava'
import { stripIllegalNames } from './_strip-illegal-names'

test('strips private files', t => {
  const input = ['one.ts', 'two.js', '_three.ts', '_four.js']
  const expected = ['one', 'two']
  t.deepEqual(expected, stripIllegalNames(input))
})

test('strips compiled files', t => {
  const input = ['one.ts', 'two.js', 'three.d.ts', 'four.js.map']
  const expected = ['one', 'two']
  t.deepEqual(expected, stripIllegalNames(input))
})

test('strips test files', t => {
  const input = ['one.test.ts', 'one.ts', 'two.test.js', 'two.js']
  const expected = ['one', 'two']
  t.deepEqual(expected, stripIllegalNames(input))
})

test('strips worker files', t => {
  const input = ['one.ts', 'one.worker.ts', 'two.js', 'two.worker.js']
  const expected = ['one', 'two']
  t.deepEqual(expected, stripIllegalNames(input))
})
