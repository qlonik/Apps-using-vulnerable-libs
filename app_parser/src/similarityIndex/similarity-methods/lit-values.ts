import { Logger } from 'pino'
// eslint-disable-next-line no-unused-vars
import { isLiteralSignatures, LiteralSignature, LiteralSignatures } from '../../extractStructure'
import logger from '../../utils/logger'
import { jaccardLikeWithMapping } from '../set'
import { DefiniteMap, probIndex, SimMapWithConfidence, typeErrorMsg } from './types'

export function librarySimilarityByLiteralValues<T extends LiteralSignature[] | LiteralSignatures>(
  log: Logger = logger,
  unknown: T,
  lib: T,
): SimMapWithConfidence {
  let unknownResolved
  let libResolved
  if (Array.isArray(unknown) && Array.isArray(lib)) {
    unknownResolved = unknown
    libResolved = lib
  } else if (isLiteralSignatures(unknown) && isLiteralSignatures(lib)) {
    unknownResolved = unknown.literalSignature
    libResolved = lib.literalSignature
  } else {
    throw new TypeError(typeErrorMsg)
  }

  const prob = { val: 1, num: -1, den: -1 }
  const { similarity, mapping } = jaccardLikeWithMapping(unknownResolved, libResolved)
  const mappedMapping = new Map() as DefiniteMap<number, probIndex>
  mapping.forEach((libI, unknownI) => mappedMapping.set(unknownI, { index: libI, prob }))

  return { similarity, mapping: mappedMapping }
}
