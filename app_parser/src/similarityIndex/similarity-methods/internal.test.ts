import test from 'ava'
import {
  FN_MATCHING_METHODS,
  getFnSig,
  getLitSig,
  LIT_MATCHING_METHODS,
  returnFunctionMatchingFn,
  returnLiteralMatchingFn,
} from './internal'
import { typeErrorMsg } from './types'

test('parameter parsing fns throw TypeError on wrong params', t => {
  const fnSigErr = t.throws(() => getFnSig(undefined, {} as any, {} as any))
  t.is(fnSigErr.message, typeErrorMsg)
  t.is(fnSigErr.name, 'TypeError')

  const litSigErr = t.throws(() => getLitSig(undefined, {} as any, {} as any))
  t.is(litSigErr.message, typeErrorMsg)
  t.is(litSigErr.name, 'TypeError')
})

test('returnFunctionMatchingFn()', t => {
  for (let name of FN_MATCHING_METHODS) {
    const fn = returnFunctionMatchingFn(name)
    t.truthy(fn)
    t.is(typeof fn, 'function')
  }

  const fn = returnFunctionMatchingFn(undefined)
  t.truthy(fn)
  t.is(typeof fn, 'function')

  const err = t.throws(() => returnFunctionMatchingFn('rnd' as any))
  t.true(err.message.startsWith('Unexpected object: '))
  t.is(err.name, 'Error')
})

test('returnLiteralMatchingFn()', t => {
  for (let name of LIT_MATCHING_METHODS) {
    const fn = returnLiteralMatchingFn(name)
    t.truthy(fn)
    t.is(typeof fn, 'function')
  }

  const fn = returnLiteralMatchingFn(undefined)
  t.truthy(fn)
  t.is(typeof fn, 'function')

  const err = t.throws(() => returnLiteralMatchingFn('rnd' as any))
  t.true(err.message.startsWith('Unexpected object: '))
  t.is(err.name, 'Error')
})
