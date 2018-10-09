import test from 'ava'
import { spy } from 'sinon'
import { provideFnSig, provideLitSig } from './internal'
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
