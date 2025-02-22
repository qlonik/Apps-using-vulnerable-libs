import { IDebugger } from 'debug'
import leftPadOrig from 'left-pad'
import { dirname } from 'path'
import { extract } from 'tar'
import { opts as extractorOpts } from '../extractStructure'

export const leftPad = (s: string | number, l: number = 4): string => {
  return leftPadOrig(s, l, '0')
}
// chunking function
const chunk = function<T>(arr: T[], len: number): T[][] {
  let i = 0
  const chunks: T[][] = []
  const n = arr.length

  while (i < n) {
    chunks.push(arr.slice(i, (i += len)))
  }

  return chunks
}

/**
 * Accepts array of arrays of **things**. The **things** are functions which return promises.
 * The function takes first array of functions in a main array, calls those functions and resolves
 * all promises in parallel. The function saves results of the first parallel group of promises
 * and then executes second group of promises (in parallel). This ensures that each group of
 * promises is resolved sequentially after each other. Since the **thing** is function that return
 * the promise, it means we can lazily evaluate all promises and not evaluate all promises at once.
 * This ensures that if we have a thousand of promises in an array, each may perform network
 * requests, we will not perform thousands of network requests in one second (or less). It ensures
 * that load can be spread over time.
 *
 * @example
 * ```typescript
 *  const r = Promise.resolve.bind(Promise)
 *  const arr = [
 *    [() => r(0), () => r(1), () => r(2)],
 *    [() => r(3), () => r(4), () => r(5)],
 *    [() => r(6), () => r(7), () => r(8)],
 *  ]
 *  const results = await resolveParallelGroups(arr)
 *  console.log(results)
 *  // logs [0, 1, 2, 3, 4, 5, 6, 7, 8]
 * ```
 *
 * @param {(() => Promise<T>)[][]} arr
 * @param {(T[]) => Promise<void>} chunkTapFn - tap function to run after each chunk.
 *    Anything returned from this function is ignored
 * @param {(T[]) => Promise<R | R[]>} chunkMapFn - chunk map function. Transforms results
 *    one chunk at a time.
 * @returns
 *
 * @async
 */
const resolveParallelGroups = async function<T, R>(
  arr: (() => Promise<T>)[][],
  {
    chunkTapFn,
    chunkMapFn,
  }: {
    chunkTapFn?: (els: T[]) => Promise<void>
    chunkMapFn?: (els: T[]) => Promise<R | R[]>
  } = {},
): Promise<R[]> {
  return arr.reduce(async (acc, chunk) => {
    const prevChunk = await acc
    const chunkRes = await Promise.all(chunk.map((fn) => fn()))
    if (chunkTapFn) {
      await chunkTapFn(chunkRes)
    }
    const mapped = chunkMapFn ? await chunkMapFn(chunkRes) : chunkRes
    return prevChunk.concat(mapped)
  }, Promise.resolve([] as any[]))
}

export const tgzUnpack = async function(file: string, cwd: string = dirname(file)) {
  return extract({ file, cwd })
}

export type opts = {
  debugDoLess?: boolean
  conservative?: boolean
  chunkLimit?: number
  chunkSize?: number
  log?: IDebugger
  extractorOpts?: extractorOpts
}

export const resolveAllOrInParallel = async function<T, R = T>(
  arr: (() => Promise<T>)[],
  {
    chunkLimit = 15,
    chunkSize = 10,
    chunkTapFn,
    chunkMapFn,
  }: {
    chunkLimit?: number
    chunkSize?: number
    chunkTapFn?: (els: T[]) => Promise<void>
    chunkMapFn?: (els: T[]) => Promise<R | R[]>
  } = {},
): Promise<R[]> {
  const chunked = arr.length < chunkLimit ? [arr] : chunk(arr, chunkSize)
  return resolveParallelGroups<T, R>(chunked, { chunkTapFn, chunkMapFn })
}

export const loAsync = <T, R>(fn: (t: T) => R) => async (x: Promise<T>): Promise<R> => fn(await x)

/**
 * This function is for the TypeScript compiler to help us
 * with the exhaustiveness of if/switch statements.
 */
export function assertNever(x: never): never {
  throw new Error('Unexpected object: ' + x)
}

export const objectHasKey = <T extends { [x: string]: any }>(
  o: T,
  k: string | number | symbol,
): k is keyof T => k in o

export { isNonNullable } from './functional'
