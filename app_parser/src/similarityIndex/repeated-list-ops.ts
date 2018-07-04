import { curry, findIndex, pullAt } from 'lodash/fp'

export interface ComparatorFn<T> {
  (a: T, b: T): boolean
  (a: T): (b: T) => boolean
  (): ComparatorFn<T>
}
export interface Ops<T> {
  i: T[]
  d: T[]
  rd: T[]
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

  return { i: intersection, d: difference, rd: _b }
}

export const repeatedOpsFp = <T>(cmp: ComparatorFn<T>) => (
  a: Iterable<T>,
  b: Iterable<T>,
): Ops<T> => {
  return [...a].reduce(
    ({ i, d, rd }, el) => {
      const j = findIndex(cmp(el), rd)
      return j === -1 ? { i, d: d.concat([el]), rd } : { i: i.concat([el]), d, rd: pullAt(j, rd) }
    },
    { i: [] as T[], d: [] as T[], rd: [...b] },
  )
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
