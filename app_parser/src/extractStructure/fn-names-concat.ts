const CONCAT_FNS_WITH = ':>>:'
export const fnNamesConcat = (p: string, f: string): string => {
  const st = p.length ? CONCAT_FNS_WITH : ''
  return p.concat(st).concat(f)
}
export const fnNamesSplit = (n: string): string[] => {
  return n.split(CONCAT_FNS_WITH)
}
