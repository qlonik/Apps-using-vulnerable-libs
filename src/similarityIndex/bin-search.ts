export const strComp = (a: string, b: string) => (a === b ? 0 : a < b ? -1 : 1)
export const numComp = (a: number, b: number) => a - b

export const binarySearch = <T>(
  arr: T[],
  el: T,
  cmpFn: (a: T, b: T) => number,
  retLowest = true,
) => {
  const len = arr.length
  let low = 0
  let high = len

  while (low < high) {
    const mid = (high + low) >>> 1
    const cmp = cmpFn(arr[mid], el)
    if (retLowest ? cmp < 0 : cmp <= 0) {
      low = mid + 1
    } else {
      high = mid
    }
  }

  // return low when matching successful, or -1 when failed
  return retLowest && low < len && cmpFn(arr[low], el) === 0
    ? low
    : !retLowest && 0 <= low - 1 && cmpFn(arr[low - 1], el) === 0 ? low - 1 : -1
}
