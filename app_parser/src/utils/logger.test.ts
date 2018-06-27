import { test } from 'ava'
import pino from 'pino'
import { Writable } from 'stream'
import { assert, log } from './logger'

class DevNull extends Writable {
  public constructor() {
    super({})
  }
  public _write(chunk: any, enc: any, cb: Function) {
    setImmediate(cb)
  }
}

test('assert', t => {
  t.true(assert(true))
  t.true(assert(true, log))
  t.true(assert(true, log, 'msg'))
  t.true(assert(true, undefined, 'msg'))
  t.true(assert(true, log, 'msg', 'error'))
  t.true(assert(true, undefined, 'msg', 'error'))
  t.true(assert(true, log, undefined, 'error'))
  t.true(assert(true, undefined, undefined, 'error'))

  t.throws(() => assert(false, pino(new DevNull())), {
    message: 'assertion error',
    instanceOf: Error,
  })
  t.throws(() => assert(false, pino(new DevNull()), 'msg'), { message: 'msg', instanceOf: Error })
})
