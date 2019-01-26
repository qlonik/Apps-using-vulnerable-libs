import { concat, filter, flow, isEqual, join as joinFp, map, replace } from 'lodash/fp'
import R from 'ramda'

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
