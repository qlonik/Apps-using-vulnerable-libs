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
  const _b = [...b].map((val) => ({ m: false, val }))

  for (let el of a) {
    const j = findIndex((o) => !o.m && cmp(o.val, el), _b)
    if (j === -1) {
      difference.push(el)
    } else {
      intersection.push(el)
      _b[j].m = true
    }
  }

  const reverseDiff = _b.filter((o) => !o.m).map((o) => o.val)

  return { i: intersection, d: difference, rd: reverseDiff }
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
