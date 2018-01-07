import { clone, curry, pullAt, sortedIndexOf } from 'lodash'


export function isSuperset<T>(a: Set<T>, b: Set<T>): boolean {
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

export type indexValue = { val: number, num: number, den: number }

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
 * <b>NOTE:</b> elements in arrays have to be sorted
 * <b>NOTE:</b> elements in arrays will be compared with '===' for equality.
 */
export const jaccardLikeForSortedArr = <T>(a: T[], b: T[]): indexValue => {

  const aCloned = clone(a)
  const aRest = [] // remaining elements
  const intersection = []
  const bRest = clone(b) // remaining elements will be here after for-loop is done

  for (let el of aCloned) {
    const i = sortedIndexOf(bRest, el)
    if (i === -1) {
      aRest.push(el)
    }
    else {
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
