import debug from 'debug'
import leftPadOrig from 'left-pad'
import { dirname } from 'path'
import { extract } from 'tar'


const pendingPromise = function <T>(): Promise<T> {
  let outResolve = (v?: T) => {}
  let outReject = (e?: Error) => {}
  const prom: any = new Promise((resolve, reject) => {
    outResolve = (value) => {
      outResolve = () => {}
      outReject = () => {}

      resolve(value)
    }
    outReject = (err) => {
      outResolve = () => {}
      outReject = () => {}

      reject(err)
    }
  })
  prom.resolve = outResolve
  prom.reject = outReject
  return prom
}
export const leftPad = (s: string | number, l: number = 4): string => {
  return leftPadOrig(s, l, '0')
}
// chunking function
export const chunk = function <T>(arr: T[], len: number): T[][] {
  let i = 0
  const chunks: T[][] = []
  const n = arr.length

  while (i < n) {
    chunks.push(arr.slice(i, i += len))
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
 * @returns {Promise<T[]>}
 *
 * @async
 */
export const resolveParallelGroups = async function <T>(arr: (() => Promise<T>)[][]): Promise<T[]> {
  const rpgLog = debug('resParGr')
  return arr.reduce(async (acc, chunk, i) => {
    rpgLog(`chunk ${leftPad(i)}`)
    const accResults = await acc
    const chunkResults = await Promise.all(chunk.map(fn => fn()))
    return accResults.concat(chunkResults)
  }, <Promise<T[]>> Promise.resolve([]))
}

export const tgzUnpack = async function (
  file: string, cwd: string = dirname(file)) {

  return extract({ file, cwd })
}

export type opts = {
  debugDoLess?: boolean,
  conservative?: boolean,
  chunkLimit?: number,
  chunkSize?: number,
  log?: debug.IDebugger,
}

export const resolveAllOrInParallel = async function <T>(
  arr: (() => Promise<T>)[],
  {
    chunkLimit = 15,
    chunkSize = 10,
  }: opts = {}): Promise<T[]> {

  if (arr.length < chunkLimit) {
    return await Promise.all(arr.map(fn => fn()))
  }
  else {
    return await resolveParallelGroups(chunk(arr, chunkSize))
  }
}

/**
 * This function is for the TypeScript compiler to help us
 * with the exhaustiveness of if/switch statements.
 */
export function assertNever(x: never): never {
  throw new Error("Unexpected object: " + x)
}

export const objectHasKey =
  <T extends { [x: string]: any }>(o: T, k: string): k is keyof T => k in o
