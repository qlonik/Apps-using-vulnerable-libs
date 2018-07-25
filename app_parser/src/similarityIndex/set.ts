import { Fraction } from 'fraction.js'
import { findIndex, isEqual } from 'lodash/fp'
import { binarySearch, numComp, strComp } from './bin-search'
import { IndexValueToFraction } from './fraction'
import {
  DefiniteMap,
  probIndex,
  similarityIndexValueAndSimilarityMap,
} from './similarity-methods/types'

export function isSubset<T>(a: Set<T>, b: Set<T>): boolean {
  for (let elem of a) {
    if (!b.has(elem)) {
      return false
    }
  }
  return true
}

export function intersection<T>(a: Set<T>, b: Set<T>): Set<T> {
  const intersection = new Set()
  for (let elem of a) {
    if (b.has(elem)) {
      intersection.add(elem)
    }
  }
  return intersection
}

export function union<T>(a: Set<T>, b: Set<T>): Set<T> {
  const union = new Set(a)
  for (let elem of b) {
    union.add(elem)
  }
  return union
}

export function difference<T>(a: Set<T>, b: Set<T>): Set<T> {
  const difference = new Set(a)
  for (let elem of b) {
    difference.delete(elem)
  }
  return difference
}

export type indexValue = { val: number; num: number; den: number }

export const jaccardIndex = <T>(a: Set<T>, b: Set<T>): indexValue => {
  const setInter = intersection(a, b)
  const num = setInter.size
  const den = a.size + b.size - num
  return { val: num / den, num, den }
}

export const similarityIndexToLib = <T>(lib: Set<T>, unknown: Set<T>): indexValue => {
  const setIntersection = intersection(lib, unknown)
  const num = setIntersection.size
  const den = lib.size
  return { val: num / den, num, den }
}

export const divByZeroAware = (num: number, den: number) => (den === 0 ? 1 : num / den)

export const jaccardLikeWithMapping = <T>(
  a: T[] | Iterable<T>,
  b: T[] | Iterable<T>,
): similarityIndexValueAndSimilarityMap => {
  const aArr = [...a]
  const aRest = []
  const intersection = []
  let bRest = [...b].map((val) => ({ __mapped: false, val }))
  const mapping = new Map<number, number>() as DefiniteMap<number, number>

  for (let [i, el] of aArr.entries()) {
    const j = findIndex((o) => !o.__mapped && isEqual(o.val, el), bRest)
    if (j === -1) {
      aRest.push(el)
    } else {
      intersection.push(el)
      bRest[j].__mapped = true
      mapping.set(i, j)
    }
  }

  bRest = bRest.filter(({ __mapped }) => !__mapped)

  if (intersection.length !== mapping.size) {
    throw new Error('unexpected error')
  }

  const num = intersection.length
  const den = aRest.length + intersection.length + bRest.length

  return {
    similarity: {
      // den === 0 only happens when both 'a' and 'b' were empty
      val: divByZeroAware(num, den),
      num,
      den,
    },
    mapping,
  }
}

/**
 * This function does not care about what elements in array represent. It just assumes that elements
 * in both arrays have the same semantic. This function will find
 * 'intersection' of two arrays (including repeating elements) and rest of elements in both arrays.
 * This function returns variation of Jaccard index which is not made for sets, but made for
 * arrays, which might have repeating elements.
 *
 * @see divByZeroAware for division by zero
 */
export const jaccardLike = <T>(a: T[] | Iterable<T>, b: T[] | Iterable<T>): indexValue => {
  let aRest = 0
  let intersection = 0
  let bRest = [...b].map((val) => ({ __mapped: false, val }))

  for (let el of a) {
    const j = findIndex((o) => !o.__mapped && isEqual(o.val, el), bRest)
    if (j === -1) {
      aRest++
    } else {
      intersection++
      bRest[j].__mapped = true
    }
  }

  bRest = bRest.filter((o) => !o.__mapped)

  const num = intersection
  const den = aRest + intersection + bRest.length
  // den === 0 only happens when both 'a' and 'b' were empty
  const val = divByZeroAware(num, den)

  return { val, num, den }
}

/**
 * This function is a special version of {@link jaccardLike}. It assumes that two passed
 * arrays are arrays of strings. Then it can sort second array and perform binary search
 * on the second array, in order to speed up the function execution.
 *
 * @see binarySearch
 *
 * @param a
 * @param b
 */
export const jaccardLikeStrings = (a: string[], b: string[]): indexValue => {
  let aRest = 0
  let intersection = 0
  let bRest = [...b].sort(strComp)

  for (let el of a) {
    const j = binarySearch(bRest, el, strComp)
    if (j === -1) {
      aRest++
    } else {
      intersection++
      bRest = bRest.filter((_, i) => i !== j)
    }
  }

  const num = intersection
  const den = aRest + intersection + bRest.length
  // den === 0 only happens when both 'a' and 'b' were empty
  const val = divByZeroAware(num, den)

  return { val, num, den }
}

/**
 * This function is a special version of {@link jaccardLike}. It assumes that two passed
 * arrays are arrays of numbers. Then it can sort second array and perform binary search
 * on the second array, in order to speed up the function execution.
 *
 * @see binarySearch
 *
 * @param a
 * @param b
 */
export const jaccardLikeNumbers = (a: number[], b: number[]): indexValue => {
  let aRest = 0
  let intersection = 0
  let bRest = [...b].sort(numComp)

  for (let el of a) {
    const j = binarySearch(bRest, el, numComp)
    if (j === -1) {
      aRest++
    } else {
      intersection++
      bRest = bRest.filter((_, i) => i !== j)
    }
  }

  const num = intersection
  const den = aRest + intersection + bRest.length
  // den === 0 only happens when both 'a' and 'b' were empty
  const val = divByZeroAware(num, den)

  return { val, num, den }
}

export const libPortion = <T>(unknown: T[] | Iterable<T>, lib: T[] | Iterable<T>): indexValue => {
  let tot = 0
  let libRest = [...lib].map((val) => ({ __mapped: false, val }))

  for (let el of unknown) {
    let j = findIndex((o) => !o.__mapped && isEqual(o.val, el), libRest)
    if (j !== -1) {
      tot++
      libRest[j].__mapped = true
    }
  }

  libRest = libRest.filter((o) => !o.__mapped)

  const num = tot
  const den = tot + libRest.length
  // den === 0 only happens when 'lib' was empty
  const val = divByZeroAware(num, den)

  return { val, num, den }
}

export const weightedMapIndex = (map: DefiniteMap<number, probIndex>): Fraction => {
  const num = [...map.values()].reduce(
    (acc: Fraction, { prob }) => acc.add(IndexValueToFraction(prob)),
    new Fraction(0),
  )

  return map.size === 0 ? new Fraction(divByZeroAware(num.valueOf(), map.size)) : num.div(map.size)
}

export const invertMap = (a: Map<number, number>): Map<number, number> => {
  const vals = [...a.values()]
  const noUndef = vals.filter((val) => val !== undefined)

  if (new Set(vals).size < vals.length) {
    throw new TypeError('values have to be unique')
  }
  if (noUndef.length < vals.length) {
    throw new TypeError('values cannot be set to undefined')
  }

  const intermediate = new Map<number, number>()
  for (let key of a.keys()) {
    const val = a.get(key)
    if (val !== undefined) {
      intermediate.set(val, key)
    }
  }
  const sorted = new Map<number, number>()
  for (let key of [...intermediate.keys()].sort((a, b) => a - b)) {
    const val = intermediate.get(key)
    if (val !== undefined) {
      sorted.set(key, val)
    }
  }
  return sorted
}

export const invertMapWithConfidence = (
  a: Map<number, probIndex>,
): DefiniteMap<number, probIndex> => {
  const setOfI = new Set<number>()
  const intermediate = new Map() as DefiniteMap<number, probIndex>
  for (let [key, v] of a.entries()) {
    if (v === undefined || v.index === undefined) {
      throw new TypeError('values cannot be set to undefined')
    }
    if (setOfI.has(v.index)) {
      throw new TypeError('values have to be unique')
    }
    setOfI.add(v.index)
    intermediate.set(v.index, { index: key, prob: v.prob })
  }
  const sorted = new Map() as DefiniteMap<number, probIndex>
  for (let key of [...intermediate.keys()].sort((a, b) => a - b)) {
    sorted.set(key, intermediate.get(key))
  }
  return sorted
}
