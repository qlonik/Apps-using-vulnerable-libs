import test from 'ava'
import { spy } from 'sinon'
import { assert } from './logger'

test('assert', t => {
  const log = {
    error: spy(),
    fatal: spy(),
  }

  t.true(assert(true))
  t.true(assert(true, log as any))
  t.true(assert(true, log as any, 'msg'))
  t.true(assert(true, undefined, 'msg'))
  t.true(assert(true, log as any, 'msg', 'error'))
  t.true(assert(true, undefined, 'msg', 'error'))
  t.true(assert(true, log as any, undefined, 'error'))
  t.true(assert(true, undefined, undefined, 'error'))
  t.true(log.error.notCalled)
  t.true(log.fatal.notCalled)

  log.error.resetHistory()
  log.fatal.resetHistory()
  t.throws(() => assert(false, log as any), { message: 'assertion error', instanceOf: Error })
  t.true(log.error.calledOnce)
  t.true(log.fatal.notCalled)

  log.error.resetHistory()
  log.fatal.resetHistory()
  t.throws(() => assert(false, log as any, 'msg'), { message: 'msg', instanceOf: Error })
  t.true(log.error.calledOnce)
  t.true(log.fatal.notCalled)

  log.error.resetHistory()
  log.fatal.resetHistory()
  t.throws(() => assert(false, log as any, 'msg', 'fatal'), { message: 'msg', instanceOf: Error })
  t.true(log.error.notCalled)
  t.true(log.fatal.calledOnce)
})
