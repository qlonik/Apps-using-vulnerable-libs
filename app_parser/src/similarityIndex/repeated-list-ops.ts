import { curry, findIndex, pullAt } from 'lodash/fp'

export interface ComparatorFn<T> {
  (a: T, b: T): boolean
  (a: T): (b: T) => boolean
  (): ComparatorFn<T>
}
export interface Ops<T> {
  i: T[]
  d: T[]
}

export const repeatedOps = <T>(cmp: ComparatorFn<T>) => (
  a: Iterable<T>,
  b: Iterable<T>,
): Ops<T> => {
  const intersection = [] as T[]
  const difference = [] as T[]
  const _b = [...b]

  for (let el of a) {
    const j = findIndex(cmp(el), _b)
    if (j === -1) {
      difference.push(el)
    } else {
      intersection.push(el)
      const size = _b.length - 1
      for (let i = j; i < size; i++) {
        _b[i] = _b[i + 1]
      }
      _b.length = size
    }
  }

  return { i: intersection, d: difference }
}

export const repeatedOpsFp = <T>(cmp: ComparatorFn<T>) => (
  a: Iterable<T>,
  b: Iterable<T>,
): Ops<T> => {
  const { i, d } = [...a].reduce(
    ({ i, d, b }, el) => {
      const j = findIndex(cmp(el), b)
      return j === -1 ? { i, d: d.concat([el]), b } : { i: i.concat([el]), d, b: pullAt(j, b) }
    },
    { i: [] as T[], d: [] as T[], b: [...b] },
  )
  return { i, d }
}

export const repeatedIntersection = curry(
  <T>(cmp: ComparatorFn<T>, a: Iterable<T>, b: Iterable<T>): T[] => repeatedOps(cmp)(a, b).i,
)
export const repeatedDifference = curry(
  <T>(cmp: ComparatorFn<T>, a: Iterable<T>, b: Iterable<T>): T[] => repeatedOps(cmp)(a, b).d,
)
export const repeatedIntersectionFp = curry(
  <T>(cmp: ComparatorFn<T>, a: Iterable<T>, b: Iterable<T>): T[] => repeatedOpsFp(cmp)(a, b).i,
)
export const repeatedDifferenceFp = curry(
  <T>(cmp: ComparatorFn<T>, a: Iterable<T>, b: Iterable<T>): T[] => repeatedOpsFp(cmp)(a, b).d,
)
