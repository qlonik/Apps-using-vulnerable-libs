import { test } from 'ava'
import { assertNever } from '../utils'
import { SortedLimitedList } from './SortedLimitedList'

test('adds and sorts for simple types', t => {
  const sllAsc = new SortedLimitedList<number>()
  // prettier-ignore
  const valAsc = sllAsc.push(1).push(2).push(3).push(4).push(5).value()
  t.deepEqual([1, 2, 3, 4, 5], valAsc)

  const sllDesc = new SortedLimitedList<number>({ predicate: n => -n })
  // prettier-ignore
  const valDesc = sllDesc.push(1).push(2).push(3).push(4).push(5).value()
  t.deepEqual([5, 4, 3, 2, 1], valDesc)
})

test('adds and sorts for complicated types', t => {
  type o = { a: string; b: { c: number; d: string } }
  const o1: o = { a: 'a', b: { c: 1, d: '1' } }
  const o2: o = { a: 'b', b: { c: 2, d: '2' } }
  const o3: o = { a: 'c', b: { c: 3, d: '3' } }
  const o4: o = { a: 'd', b: { c: 4, d: '4' } }

  const sll = new SortedLimitedList<o>({
    predicate: o => -o.b.c,
    limit: 3,
  })
  const val = sll.push([o1, o2, o3, o4]).value()

  t.deepEqual([o4, o3, o2], val)
})

test('allows adding arrays', t => {
  const sllDesc = new SortedLimitedList<number>({ predicate: n => -n })
  const valDesc = sllDesc.push([1, 2, 3, 4, 5]).value()
  t.deepEqual([5, 4, 3, 2, 1], valDesc)
})

test('follows the limit', t => {
  const sll = new SortedLimitedList<number>({ limit: 5 })
  const val = sll.push([9, 8, 7, 6, 5, 4, 3, 2, 1]).value()
  t.deepEqual([1, 2, 3, 4, 5], val)
})

test('applies filter', t => {
  const sll = new SortedLimitedList<number>({ limit: 5 })
  const val = sll
    .push([9, 8, 7, 6, 5, 4, 3, 2, 1])
    .filter(v => v % 2 === 0)
    .value()
  t.deepEqual([2, 4], val)
})

test('applies filter and mutates type', t => {
  type t1 = { a: string; b: { c: number; d: string } }
  type t2 = { b: { c: number; d: string }; e: string }

  const o1: t1 = { a: 'a', b: { c: 1, d: '1' } }
  const o2: t2 = { b: { c: 2, d: '2' }, e: 'b' }
  const o3: t1 = { a: 'c', b: { c: 3, d: '3' } }
  const o4: t2 = { b: { c: 4, d: '4' }, e: 'd' }

  const oIsT2 = (o: t1 | t2): o is t2 => 'e' in o

  const sll = new SortedLimitedList<t1 | t2>({
    predicate: (o: t1 | t2) => o.b.c,
    limit: 5,
  })
  const val = sll
    .push([o1, o2, o3, o4])
    .filter(oIsT2)
    .value()

  t.deepEqual([o2, o4], val)
  for (let el of val) {
    if (!oIsT2(el)) {
      try {
        assertNever(el)
      } catch {
        t.fail('failed type assertion')
      }
    }
  }
})

test('does not push after value()', t => {
  const sll = new SortedLimitedList<number>()
  const val = sll.push([4, 3, 2, 1]).value()

  t.deepEqual([1, 2, 3, 4], val)
  t.throws(() => sll.push(5), Error)
})

test('does not return on second value()', t => {
  const sll = new SortedLimitedList<number>()
  const val = sll.push([4, 3, 2, 1]).value()

  t.deepEqual([1, 2, 3, 4], val)
  t.throws(() => sll.value(), Error)
})
