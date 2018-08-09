import { jaccardLikeWithMapping } from '../set'
import { getLitSig } from './internal'
import { DefiniteMap, LiteralMatchingFn, probIndex, SimMapWithConfidence } from './types'

export const librarySimilarityByLiteralValues: LiteralMatchingFn = function LitVals(
  logS,
  unknownS,
  libS,
): SimMapWithConfidence {
  const [log, unknownResolved, libResolved] = getLitSig(logS, unknownS, libS)

  const prob = { val: 1, num: -1, den: -1 }
  const { similarity, mapping } = jaccardLikeWithMapping(unknownResolved, libResolved)
  const mappedMapping = new Map() as DefiniteMap<number, probIndex>
  mapping.forEach((libI, unknownI) => mappedMapping.set(unknownI, { index: libI, prob }))

  return { similarity, mapping: mappedMapping }
}
