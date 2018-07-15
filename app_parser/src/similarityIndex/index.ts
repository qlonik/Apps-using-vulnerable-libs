import { SourceLocation } from 'babel-types'
import { sortBy } from 'lodash/fp'
import { FunctionSignature, LiteralSignatures, signatureWithComments } from '../extractStructure'
import {
  getLibLiteralSig,
  getLibNameVersionSigContents,
  libNameVersion,
  libNameVersionSigContent,
  libNameVersionSigFile,
} from '../parseLibraries'
import { indexValue, isSubset, jaccardIndex } from './set'
import { v6 } from './similarity-methods/fn-st-tokens'
import { probIndex, SimMapWithConfidence } from './similarity-methods/types'
import { SortedLimitedList } from './SortedLimitedList'

/* eslint-disable no-unused-vars */
declare const __x: SourceLocation
declare const __y: probIndex
/* eslint-enable */

export type Similarity = libNameVersion & {
  file: string
  similarity: indexValue
}

export type matchedLib = libNameVersionSigFile & SimMapWithConfidence
export type rankType = {
  name: string
  index: indexValue
  top: number
  matches: matchedLib[]
}

const matchesToLibFactory = (
  libsPath: string,
  fn: (a: FunctionSignature[], b: FunctionSignature[]) => SimMapWithConfidence,
) => (remaining: FunctionSignature[], libNVS: libNameVersionSigContent[]): matchedLib[] => {
  return libNVS
    .reduce(
      (acc, { name, version, file, signature: { functionSignature } }) =>
        acc.push({ name, version, file, ...fn(remaining, functionSignature) }),
      new SortedLimitedList<matchedLib>({ limit: 5, predicate: (o) => -o.similarity.val }),
    )
    .value()
    .filter((o) => o.similarity.val > 0)
    .map((v) => ({
      ...v,
      mapping: new Map(
        [...v.mapping.entries()]
          .map(([index, pi]): [number, probIndex] => [remaining[index].index, pi])
          .sort((a, b) => a[0] - b[0]),
      ) as typeof v.mapping,
    }))
}

export const bundle_similarity_fn = async (
  unknownSig: signatureWithComments,
  candidates: candidateLib[],
  libsPath: string,
  fn: (a: FunctionSignature[], b: FunctionSignature[]) => SimMapWithConfidence = v6,
): Promise<{ rank: rankType[]; secondary: rankType[]; remaining: FunctionSignature[] }> => {
  // sort candidates by most likely one
  // for each candidate:
  //   match all versions against bundle
  //   keep top5, which has similarity value > 0
  //   update top5's mapping to map to real indexes from unknownSig
  //   from copy of unknownSig, remove mapped functions of top1 candidate
  //   run from beginning of for-loop with remaining unmapped functions
  const mRemainingToLib = matchesToLibFactory(libsPath, fn)
  const preparedCandidates = sortBy((o) => -o.index.val, candidates).map(({ name, index }, i) => ({
    name,
    index,
    top: i + 1,
  }))

  const rank: rankType[] = []
  const secondary: rankType[] = []
  const later: typeof preparedCandidates = []
  const remaining: FunctionSignature[] = [...unknownSig.functionSignature]

  for (let candidate of preparedCandidates) {
    const libNVS = await getLibNameVersionSigContents(libsPath, candidate.name)
    const matches = mRemainingToLib(remaining, libNVS)
    const top = matches.length > 0 ? matches[0] : null

    if (top && top.similarity.val === 1) {
      rank.push({ ...candidate, matches })

      // filter out elements from remaining array which are in the top mapping
      // original filter implementation comes from lodash's _arrayFilter.js file
      let index = -1
      let resIndex = 0
      const length = remaining.length
      while (++index < length) {
        const value = remaining[index]
        if (!top.mapping.has(value.index)) {
          remaining[resIndex++] = value
        }
      }
      remaining.length = resIndex
    } else {
      later.push(candidate)
    }
  }

  for (let candidate of later) {
    const libNVS = await getLibNameVersionSigContents(libsPath, candidate.name)
    const matches = mRemainingToLib(remaining, libNVS)
    const top = matches.length > 0 ? matches[0] : null

    // remark: bad idea as it is prioritizing libs sorted by name
    // So, lib starting with 'a' has higher chance of being selected
    // compared to lib starting with 'z'.
    if (top) {
      secondary.push({ ...candidate, matches })

      let index = -1
      let resIndex = 0
      const length = remaining.length
      while (++index < length) {
        const value = remaining[index]
        if (!top.mapping.has(value.index)) {
          remaining[resIndex++] = value
        }
      }
      remaining.length = resIndex
    }
  }

  return { rank, secondary, remaining }
}

export type candidateLib = { name: string; index: indexValue }
export const getCandidateLibs = async ({
  signature,
  libsPath,
  opts: { limit = undefined } = {},
}: {
  signature: LiteralSignatures
  libsPath: string
  opts?: { limit?: number }
}): Promise<candidateLib[]> => {
  const appLitSig = new Set(signature.literalSignature)
  if (appLitSig.size === 0) {
    return []
  }

  const nameSigs = await getLibLiteralSig(libsPath)
  const candidates = nameSigs
    .filter(({ literal }) => literal.size > 0)
    .filter(({ literal }) => isSubset(appLitSig, literal))
    .map(({ name }) => ({ name, index: { val: 1, num: -1, den: -1 } }))

  if (candidates.length > 0) {
    return candidates
  }

  // probably a bad idea VVV
  return nameSigs
    .reduce(
      (sll, { name, literal }) => sll.push({ name, index: jaccardIndex(appLitSig, literal) }),
      new SortedLimitedList({
        predicate: (o: { name: string; index: indexValue }) => -o.index.val,
        limit,
      }),
    )
    .value()
    .filter(({ index }) => index.val !== 0)
}
