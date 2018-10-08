import test from 'ava'
import arb from 'jsverify'
import { filter as _filter, sortBy, take } from 'lodash'
import { check } from '../_helpers/property-test'
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

test(
  'sll sorts values',
  check(arb.array(arb.number), (t, arr) => {
    const sllAsc = new SortedLimitedList<number>({ limit: arr.length })
    const valAsc = sllAsc.push(arr).value()
    t.deepEqual(sortBy(arr), valAsc)

    const sllDesc = new SortedLimitedList<number>({ limit: arr.length, predicate: n => -n })
    const valDesc = sllDesc.push(arr).value()
    t.deepEqual(sortBy(arr, n => -n), valDesc)
  }),
)

test(
  'adding el-by-el is same as entire array',
  check(arb.nat, arb.array(arb.number), (t, limit, arr) => {
    const elByEl = new SortedLimitedList<number>({ limit })
    for (let el of arr) {
      elByEl.push(el)
    }
    const elByElVal = elByEl.value()

    const entireArr = new SortedLimitedList({ limit })
    const entireArrVal = entireArr.push(arr).value()

    t.deepEqual(elByElVal, entireArrVal)
  }),
)

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

test(
  'ssl sorts complicated types',
  check(
    arb.nat,
    arb.array(
      arb.record({
        a: arb.string,
        b: arb.record({
          c: arb.number,
          d: arb.string,
        }),
      }),
    ),
    (t, limit, arr) => {
      type o = { a: string; b: { c: number; d: string } }
      const predicate = (o: o) => -o.b.c
      const expected = take(sortBy(arr, predicate), limit)

      const sll = new SortedLimitedList({ limit, predicate })
      const val = sll.push(arr).value()
      t.deepEqual(expected, val)
    },
  ),
)

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

test(
  'limit is honoured',
  check(arb.nat, arb.array(arb.integer), (t, limit, arr) => {
    const sll = new SortedLimitedList<number>({ limit })
    const val = sll.push(arr).value()
    t.true(val.length <= limit)
  }),
)

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
