import test from 'ava'
import { transformAndCleanScriptNames } from './_strip-illegal-names'

test('strips private files', t => {
  const input = ['one.ts', 'two.js', '_three.ts', '_four.js']
  const expected = ['one', 'two']
  t.deepEqual(expected, transformAndCleanScriptNames(input))
})

test('strips compiled files', t => {
  const input = ['one.ts', 'two.js', 'three.d.ts', 'four.js.map']
  const expected = ['one', 'two']
  t.deepEqual(expected, transformAndCleanScriptNames(input))
})

test('strips test files', t => {
  const input = ['one.test.ts', 'one.ts', 'two.test.js', 'two.js']
  const expected = ['one', 'two']
  t.deepEqual(expected, transformAndCleanScriptNames(input))
})

test('strips worker files', t => {
  const input = ['one.ts', 'one.worker.ts', 'two.js', 'two.worker.js']
  const expected = ['one', 'two']
  t.deepEqual(expected, transformAndCleanScriptNames(input))
})

test('strips extensions properly', t => {
  const input = ['one.ts', 'two.js', 'three', 'four.hi.tsx', 'five.hi.jsx', 'six.hi']
  const expected = ['one', 'two', 'three', 'four-hi', 'five-hi', 'six-hi']
  t.deepEqual(expected, transformAndCleanScriptNames(input))
})

test('does not strip extensions when they are missing', t => {
  const input = ['ats', 'ajs', 'atsx', 'ajsx', 'a.ts', 'b.js', 'c.tsx', 'd.jsx']
  const expected = ['ats', 'ajs', 'atsx', 'ajsx', 'a', 'b', 'c', 'd']
  t.deepEqual(expected, transformAndCleanScriptNames(input))
})

test('does not strip directories when in test mode', t => {
  const input = ['fixtures/one.ts', 'dir/two.ts', 'three.ts']
  const expected = ['fixtures/one', 'dir/two', 'three']
  t.deepEqual(expected, transformAndCleanScriptNames(input))
})

test.serial('strips directories when not in test mode', t => {
  const input = ['fixtures/one.ts', 'dir/two.ts', 'three.ts']
  const expected = ['three']

  const origEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'anything'
  t.deepEqual(expected, transformAndCleanScriptNames(input))
  process.env.NODE_ENV = origEnv
})

test.serial('strips ../../../ dirs', t => {
  const input = [
    '../../../one.ts',
    '../../dir/two.ts',
    '../../../../../../../../one/more/dir/three.ts',
  ]
  const expected = ['one']

  const origEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'anything'
  t.deepEqual(expected, transformAndCleanScriptNames(input))
  process.env.NODE_ENV = origEnv
})

test.serial('lets scripts in allowed dirs', t => {
  const input = [
    '../../../one.ts',
    '../../dir/two.ts',
    '../../../../../../../../one/more/dir/three.ts',
    'allowed/four.ts',
    'another/five.ts',
    'not-allowed/six.ts',
  ]
  const allowedDirs = ['allowed', 'another']
  const expected = ['one', 'allowed/four', 'another/five']

  const origEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'anything'
  t.deepEqual(expected, transformAndCleanScriptNames(input, allowedDirs))
  process.env.NODE_ENV = origEnv
})
