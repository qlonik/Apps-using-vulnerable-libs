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

export const divByZeroIsOne = (num: number, den: number) => (den === 0 ? 1 : num / den)
export const divByZeroIsZero = (num: number, den: number) => (den === 0 ? 0 : num / den)

export const jaccardIndex = <T>(a: Set<T>, b: Set<T>): indexValue => {
  const setInter = intersection(a, b)
  const num = setInter.size
  const den = a.size + b.size - num
  const val = divByZeroIsOne(num, den)
  return { val, num, den }
}

export const similarityIndexToLib = <T>(lib: Set<T>, unknown: Set<T>): indexValue => {
  const setIntersection = intersection(lib, unknown)
  const num = setIntersection.size
  const den = lib.size
  const val = unknown.size === 0 ? divByZeroIsOne(num, den) : divByZeroIsZero(num, den)
  return { val, num, den }
}

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

  const num = intersection.length
  const den = aRest.length + intersection.length + bRest.length

  return {
    similarity: {
      // den === 0 only happens when both 'a' and 'b' were empty
      val: divByZeroIsOne(num, den),
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
 * @see divByZeroIsOne for division by zero
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
  const val = divByZeroIsOne(num, den)

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
  const val = divByZeroIsOne(num, den)

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
  const val = divByZeroIsOne(num, den)

  return { val, num, den }
}

export const libPortion = <T>(unknown: T[] | Iterable<T>, lib: T[] | Iterable<T>): indexValue => {
  let unkLen = 0
  let tot = 0
  let libRest = [...lib].map((val) => ({ __mapped: false, val }))

  for (let el of unknown) {
    unkLen += 1
    let j = findIndex((o) => !o.__mapped && isEqual(o.val, el), libRest)
    if (j !== -1) {
      tot++
      libRest[j].__mapped = true
    }
  }

  libRest = libRest.filter((o) => !o.__mapped)

  const num = tot
  const den = tot + libRest.length
  // if len(unknown) = 0
  //   then (if len(lib) = 0 then both are empty, treat as 100%)
  //   else (if len(lib) = 0 then only lib is empty, treat as 0%)
  const val = unkLen === 0 ? divByZeroIsOne(num, den) : divByZeroIsZero(num, den)

  return { val, num, den }
}

export const libPortionWithMapping = <T>(
  unknown: T[] | Iterable<T>,
  lib: T[] | Iterable<T>,
): similarityIndexValueAndSimilarityMap => {
  const unkwnArr = [...unknown]
  const unkwnRest = []
  const intersection = []
  let libRest = [...lib].map((val) => ({ __mapped: false, val }))
  const mapping = new Map<number, number>() as DefiniteMap<number, number>

  for (let [i, el] of unkwnArr.entries()) {
    const j = findIndex((o) => !o.__mapped && isEqual(o.val, el), libRest)
    if (j === -1) {
      unkwnRest.push(el)
    } else {
      intersection.push(el)
      libRest[j].__mapped = true
      mapping.set(i, j)
    }
  }

  libRest = libRest.filter(({ __mapped }) => !__mapped)

  const num = intersection.length
  const den = intersection.length + libRest.length
  const val = unkwnArr.length === 0 ? divByZeroIsOne(num, den) : divByZeroIsZero(num, den)

  return { similarity: { val, num, den }, mapping }
}

/**
 * This function is a special version of {@link libPortion}. It assumes that unknown and
 * lib are special number arrays. Specifically, it treats these arrays as arrays of indexes.
 * Additionally, it makes an assumption that unknown array might have '-1' values, but
 * lib array will never have those values. Since this function knows that two passed arrays
 * are always number arrays, it can sort lib array and perform binary search on it, in
 * order to speed up function execution.
 *
 * @see binarySearch
 *
 * @param unknown
 * @param lib
 */
export const libPortionIndexes = (unknown: number[], lib: number[]): indexValue => {
  let tot = 0
  let libRest = [...lib].sort(numComp)

  for (let el of unknown) {
    if (el !== -1) {
      let j = binarySearch(libRest, el, numComp)
      if (j !== -1) {
        tot++
        libRest = libRest.filter((_, i) => i !== j)
      }
    }
  }

  const num = tot
  const den = tot + libRest.length
  // if len(unknown) = 0
  //   then (if len(lib) = 0 then both are empty, treat as 100%)
  //   else (if len(lib) = 0 then only lib is empty, treat as 0%)
  const val = unknown.length === 0 ? divByZeroIsOne(num, den) : divByZeroIsZero(num, den)

  return { val, num, den }
}

export const weightedMapIndex = (map: DefiniteMap<number, probIndex>): Fraction => {
  const num = [...map.values()].reduce(
    (acc: Fraction, { prob }) => acc.add(IndexValueToFraction(prob)),
    new Fraction(0),
  )

  return map.size === 0 ? new Fraction(divByZeroIsOne(num.valueOf(), map.size)) : num.div(map.size)
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
