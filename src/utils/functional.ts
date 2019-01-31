import { concat, filter, flow, isEqual, join as joinFp, map, replace } from 'lodash/fp'
import R from 'ramda'
import { Falsy } from './types'

export const addMissing: <T>(x: T[], y: T[]) => T[] = (x, y) =>
  concat(x, filter((el) => x.findIndex(isEqual(el)) === -1, y))

export const liftFn: <X, Y, R>(f: (x: X, y: Y) => R) => (a: X[], b: Y[]) => R[] = (f) =>
  flow(
    R.zip,
    map(([x, y]) => f(x, y)),
  )

export const matrixToCSV: (x: string[][]) => string = flow(
  map(
    flow(
      map(replace(',', '_')),
      joinFp(','),
    ),
  ),
  joinFp('\n'),
)

export interface FilterFn {
  <T, S extends T>(fn: (value: T) => value is S, arr: T[]): S[]
  <T, S extends T>(fn: (value: T) => value is S): (arr: T[]) => S[]
  <T>(fn: (value: T) => boolean, arr: T[]): T[]
  <T>(fn: (value: T) => boolean): (arr: T[]) => T[]
}
export const filterFn: FilterFn = R.curry((fn: any, arr: any) => arr.filter(fn))

export const isNonFalsy = <T>(x: T): x is Exclude<T, Falsy> => !!x
export const isNonNullable = <T>(x: T): x is NonNullable<T> => x !== null && x !== undefined

export const filterFalsy: <T>(x: T[]) => Exclude<T, Falsy>[] = filterFn(isNonFalsy)
export const filterNullable: <T>(x: T[]) => NonNullable<T>[] = filterFn(isNonNullable)

export interface IndexedMapFn {
  <T, U>(f: (x: T, i: number, list?: T[]) => U): (l: T[]) => U[]
  <T, U>(f: (x: T, i: number, list?: T[]) => U, l: T[]): U[]
}
export const indexedMap: IndexedMapFn = R.addIndex(R.map)
