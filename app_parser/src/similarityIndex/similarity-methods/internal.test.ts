import test from 'ava'
import { spy } from 'sinon'
import {
  FN_MATCHING_METHODS,
  LIT_MATCHING_METHODS,
  provideFnSig,
  provideLitSig,
  returnFunctionMatchingFn,
  returnLiteralMatchingFn,
} from './internal'
import { typeErrorMsg } from './types'

test('parameter parsing fns throw TypeError on wrong params', t => {
  const method1 = spy()
  const fnSigErr = t.throws(() => provideFnSig(method1)(undefined, {} as any, {} as any))
  t.false(method1.called)
  t.is(fnSigErr.message, typeErrorMsg)
  t.is(fnSigErr.name, 'TypeError')

  const method2 = spy()
  const litSigErr = t.throws(() => provideLitSig(method2)(undefined, {} as any, {} as any))
  t.false(method2.called)
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
