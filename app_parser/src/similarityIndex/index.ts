import { SourceLocation } from 'babel-types'
import { sortBy } from 'lodash/fp'
import { FunctionSignature, LiteralSignatures, signatureWithComments } from '../extractStructure'
import {
  getLibLiteralSig,
  getLibNameVersionSigContents,
  libNameVersion,
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
) => async (remaining: FunctionSignature[], name: string): Promise<matchedLib[]> => {
  return (await getLibNameVersionSigContents(libsPath, name))
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
): Promise<{ rank: rankType[]; remaining: FunctionSignature[] }> => {
  // sort candidates by most likely one
  // for each candidate:
  //   match all versions against bundle
  //   keep top5, which has similarity value > 0
  //   update top5's mapping to map to real indexes from unknownSig
  //   from copy of unknownSig, remove mapped functions of top1 candidate
  //   run from beginning of for-loop with remaining unmapped functions
  const mRemainingToLib = matchesToLibFactory(libsPath, fn)
  return sortBy((o) => -o.index.val, candidates)
    .map(({ name, index }, i) => ({ name, index, top: i + 1 }))
    .reduce(
      async (acc, candidate) => {
        const { rank, remaining } = await acc
        const matches = await mRemainingToLib(remaining, candidate.name)

        const top = matches.length > 0 ? matches[0].mapping : null
        const reduced = top === null ? remaining : remaining.filter(({ index }) => !top.has(index))

        return {
          rank: rank.concat({ ...candidate, matches }),
          remaining: reduced,
        }
      },
      Promise.resolve({
        rank: [] as rankType[],
        remaining: [...unknownSig.functionSignature] as FunctionSignature[],
      }),
    )
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
