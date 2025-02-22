import test from 'ava'
import { stripIndent } from 'common-tags'
import arb from 'jsverify'
import R from 'ramda'
import { check } from '../_helpers/property-test'
import { arraysPair } from '../_helpers/arbitraries'
import {
  addMissing,
  filterFalsy,
  filterNullable,
  indexedMap,
  liftFn,
  matrixToCSV,
} from './functional'

const uniqueInts = arb.array(arb.integer).smap(R.uniq, R.identity)

test(
  'addMissing() produces array of unique elements when added into empty',
  check(uniqueInts, (t, a) => {
    t.deepEqual(addMissing([], a), a)
  }),
)

test(
  'addMissing() produces array of unique elements when used as reducer',
  check(arb.array(uniqueInts), (t, a) => {
    const reduced = R.reduce<number[], number[]>(addMissing, [], a)
    t.deepEqual(reduced, R.uniq(R.unnest(a)))
  }),
)

test(
  'addMissing() does not care about order when adding into empty array',
  check(arraysPair(uniqueInts), (t, [a, b]) => {
    const ab = R.concat(a, b)
    const ba = R.concat(b, a)
    const reduceSort = R.pipe(
      R.reduce<number[], number[]>(addMissing, []),
      R.sort(R.subtract),
    )

    t.deepEqual(reduceSort(ab), reduceSort(ba))
  }),
)

test(
  'liftFn() applies "function on pair" on pair of arrays',
  check(arb.fn(arb.fn(arb.integer)), uniqueInts, uniqueInts, (t, _f, a, b) => {
    const f: (a: any, b: any) => number = R.uncurryN(2, _f)

    const expectedResult = []
    for (let i = 0, len = Math.min(a.length, b.length); i < len; i++) {
      expectedResult.push(f(a[i], b[i]))
    }

    t.deepEqual(expectedResult, liftFn(f)(a, b))
  }),
)

test(
  'liftFn() lifts addMissing()',
  check(arb.array(arb.tuple([uniqueInts, uniqueInts])), (t, x) => {
    const ex = [
      x.map(x_ => x_[0]).reduce(addMissing, []),
      x.map(x_ => x_[1]).reduce(addMissing, []),
    ]

    const tAddMissing = addMissing as (x: number[], y: number[]) => number[]
    const re = R.reduce(liftFn(tAddMissing), [[] as number[], [] as number[]], x)

    t.deepEqual(ex, re)
  }),
)

test('matrixToCSV()', t => {
  const m = /* prettier-ignore */ [
    ['a', 'b', ',c', 'd'],
    ['e', ',f', 'g', 'h'],
    ['0', '1', '2', '3,']
  ]

  const ex = stripIndent`
    a,b,_c,d
    e,_f,g,h
    0,1,2,3_
  `

  t.deepEqual(ex, matrixToCSV(m))
})

const arbMatrix = arb
  .nearray(arb.nearray(arb.asciinestring))
  .smap<string[][]>(x => {
    const minL = R.apply(Math.min, R.map(arr => arr.length, x))
    return R.map(R.take(minL), x)
  }, R.identity)
  .smap<string[][]>(R.map(R.map(R.replace(/,/g, '_'))), R.identity)
test(
  'matrixToCSV() encodes/decodes arbitrary data',
  check(arbMatrix, (t, m) => {
    const dec: (csv: string) => string[][] = R.pipe(
      R.split('\n'),
      R.map(R.split(',')),
    )

    t.deepEqual(m, dec(matrixToCSV(m)))
  }),
)

test('filterFalsy() removes falsy', t => {
  const arr = [undefined, null, 0, 1, 2, 3, 4, 5, '', 'hello', 'world', true, false]
  const exp = [1, 2, 3, 4, 5, 'hello', 'world', true]
  t.deepEqual(filterFalsy(arr), exp)
})

test('filterNullable() removes undefined and null', t => {
  const arr = [undefined, null, 0, 1, 2, 3, 4, 5, '', 'hello', 'world', true, false]
  const exp = [0, 1, 2, 3, 4, 5, '', 'hello', 'world', true, false]
  t.deepEqual(filterNullable(arr), exp)
})

test(
  'filterFalsy() can be applied many times',
  check(arb.array(arb.json), (t, arr) => {
    t.deepEqual(filterFalsy(filterFalsy(arr)), filterFalsy(arr))
  }),
)

test(
  'filterNullable() can be applied many times',
  check(arb.array(arb.json), (t, arr) => {
    t.deepEqual(filterNullable(filterNullable(arr)), filterNullable(arr))
  }),
)

test(
  'indexedMap() behaves like map',
  check(arb.fn(arb.fn(arb.fn(arb.nat))), arb.array(arb.nat), (t, f, arr) => {
    const mapFn: (x: any, y: any, z: any) => number = R.uncurryN(3, f)
    t.deepEqual(indexedMap(mapFn)(arr), arr.map(mapFn))
  }),
)

test(
  'indexedMap() exposes values and indexes',
  check(arb.array(arb.nat), (t, arr) => {
    let actSum = 0
    indexedMap((_, i) => (actSum += i))(arr)

    let expSum = 0
    for (let i = 0; i < arr.length; i++) {
      expSum += i
    }

    t.is(actSum, expSum)
  }),
)
