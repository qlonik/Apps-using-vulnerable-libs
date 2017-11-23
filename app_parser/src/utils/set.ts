import { readJSON } from 'fs-extra'
import { curry } from 'lodash';


export function isSuperset<T>(a: Set<T>, b: Set<T>): boolean {
  for (let elem of a) {
    if (!b.has(elem)) {
      return false;
    }
  }
  return true;
}

export function intersection<T>(a: Set<T>, b: Set<T>): Set<T> {
  const intersection = new Set();
  for (let elem of a) {
    if (b.has(elem)) {
      intersection.add(elem);
    }
  }
  return intersection;
}

export function union<T>(a: Set<T>, b: Set<T>): Set<T> {
  const union = new Set(a);
  for (let elem of b) {
    union.add(elem);
  }
  return union;
}

export function difference<T>(a: Set<T>, b: Set<T>): Set<T> {
  const difference = new Set(a);
  for (let elem of b) {
    difference.delete(elem);
  }
  return difference;
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


export async function makeSetOutOfFilePath(filePath: string): Promise<Set<string>> {
  return makeSetOutOfArray(await readJSON(filePath))
}

export function makeSetOutOfArray(arr: string[]): Set<string> {
  return new Set(arr)
}
