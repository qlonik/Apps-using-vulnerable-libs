import { curry, pullAt, findIndex } from 'lodash'
import { DefiniteMap, similarityIndexValueAndSimilarityMap } from './similarity-methods/types'

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

export const similarityIndexToLib = curry(<T>(lib: Set<T>, unknown: Set<T>): indexValue => {
  const setIntersection = intersection(lib, unknown)
  const num = setIntersection.size
  const den = lib.size
  return { val: num / den, num, den }
})

/**
 * This function does not care about what elements in array represent. It just assumes that elements
 * in both arrays have the same semantic. This function will find
 * 'intersection' of two arrays (including repeating elements) and rest of elements in both arrays.
 * This function returns variation of Jaccard index which is not made for sets, but made for
 * arrays, which might have repeating elements.
 * This function will return 1 for two empty arrays.
 *
 * <b>NOTE:</b> elements in arrays will be compared with '===' for equality.
 *
 * @deprecated
 */
export const jaccardLike = <T>(a: T[] | Iterable<T>, b: T[] | Iterable<T>): indexValue => {
  const aRest = [] // remaining elements
  const intersection = []
  const bRest = [...b] // remaining elements will be here after for-loop is done

  for (let el of a) {
    const i = bRest.indexOf(el)
    if (i === -1) {
      aRest.push(el)
    } else {
      intersection.push(el)
      pullAt(bRest, i)
    }
  }

  const num = intersection.length
  const den = aRest.length + intersection.length + bRest.length

  return {
    // den === 0 only happens when both 'a' and 'b' were empty
    val: den === 0 ? 1 : num / den,
    num,
    den,
  }
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
    const j = findIndex(bRest, (o) => !o.__mapped && o.val === el)
    if (j === -1) {
      aRest.push(el)
    } else {
      intersection.push(el)
      bRest = bRest.map((el, k) => (j !== k ? el : { ...el, __mapped: true }))
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
      val: den === 0 ? 1 : num / den,
      num,
      den,
    },
    mapping,
  }
}

export const invertMap = <K, V>(a: Map<K, V>): Map<V, K> => {
  const vals = [...a.values()]
  const noUndef = vals.filter((val) => val !== undefined)

  if (new Set(vals).size < vals.length) {
    throw new TypeError('values have to be unique')
  }
  if (noUndef.length < vals.length) {
    throw new TypeError('values cannot be set to undefined')
  }

  const map = new Map<V, K>()
  for (let key of a.keys()) {
    const val = a.get(key)
    if (val !== undefined) {
      map.set(val, key)
    }
  }
  return map
}
