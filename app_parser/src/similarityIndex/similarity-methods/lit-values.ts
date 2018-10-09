import { jaccardLikeWithMapping } from '../set'
import { provideLitSig } from './internal'
import { DefiniteMap, probIndex } from './types'

export const librarySimilarityByLiteralValues = provideLitSig(function LitVals(
  log,
  unknownResolved,
  libResolved,
) {
  const prob = { val: 1, num: -1, den: -1 }
  const { similarity, mapping } = jaccardLikeWithMapping(unknownResolved, libResolved)
  const mappedMapping = new Map() as DefiniteMap<number, probIndex>
  mapping.forEach((libI, unknownI) => mappedMapping.set(unknownI, { index: libI, prob }))

  return { similarity, mapping: mappedMapping }
})
