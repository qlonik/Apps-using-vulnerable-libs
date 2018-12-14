import { SourceLocation } from 'babel-types'
import { map, sortBy } from 'lodash/fp'
import { Logger } from 'pino'
import { Omit } from 'typical-mini'
import { promisify } from 'util'
import { FunctionSignature, LiteralSignatures, signatureWithComments } from '../extractStructure'
import {
  getLibLiteralSig,
  getLibNameVersionSigContents,
  libNameVersion,
  libNameVersionSigContent,
  libNameVersionSigFile,
  shuffleVersions,
} from '../parseLibraries'
import { indexValue, isSubset, jaccardIndex } from './set'
import { FN_MATCHING_METHODS_TYPE, returnFunctionMatchingFn } from './similarity-methods'
import { probIndex, SimMapWithConfidence, MatchingFn } from './similarity-methods/types'
import { SortedLimitedList } from './sorted-limited-list'

const nextTick = promisify(setImmediate)

/* eslint-disable no-unused-vars */
declare const __x: SourceLocation
declare const __y: probIndex
/* eslint-enable */

export type primitive = string | number | null | undefined | boolean
/* eslint-disable typescript/no-use-before-define */
export type serializableObject =
  | primitive
  | { [x: number]: serializableObject }
  | { [y: string]: serializableObject }
/* eslint-enable typescript/no-use-before-define */

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

export type candidateLib = { name: string; index: indexValue }

export type BundleSimFnArg = {
  libsPath: string
  signature: signatureWithComments
  candidates: candidateLib[]
  log: Logger
  fn?: FN_MATCHING_METHODS_TYPE
}
export type BundleSimFnArgSerializable = {
  libsPath: string
  signaturePath: string
  candidatesPath: string
  log: { [x: string]: serializableObject }
  fn?: FN_MATCHING_METHODS_TYPE
}
export type SerializableRankType = Omit<rankType, 'matches'> & {
  matches: (Omit<matchedLib, 'mapping'> & {
    mapping: [number, probIndex][]
  })[]
}

export type BundleSimFnReturn = {
  rank: SerializableRankType[]
  secondary: SerializableRankType[]
  remaining: FunctionSignature[]
}

const matchesToLibFactory = (libsPath: string, fn: MatchingFn) => async (
  log: Logger,
  remaining: FunctionSignature[],
  libNVS: libNameVersionSigContent[],
  stopOnFirstExactMatch = false,
): Promise<matchedLib[]> => {
  const sll = new SortedLimitedList<matchedLib>({ limit: 5, predicate: (o) => -o.similarity.val })

  for (let { name, version, file, signature: { functionSignature } } of libNVS) {
    await nextTick()
    const verLog = log.child({ lib: { name, version, file } })

    const start = process.hrtime()
    const res = fn(verLog, remaining, functionSignature)
    const end = process.hrtime(start)
    verLog.debug(
      {
        'app-fn-count': remaining.length,
        'lib-fn-count': functionSignature.length,
        'time-taken': end,
        similarity: res.similarity,
      },
      '>----> finish one version of candidate',
    )

    sll.push({ name, version, file, ...res })
    if (stopOnFirstExactMatch && res.similarity.val === 1) {
      break
    }
  }

  return sll
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

const mapToArrayPairs = map((r: rankType) => ({
  ...r,
  matches: r.matches.map((m) => ({
    ...m,
    mapping: [...m.mapping.entries()] as [number, probIndex][],
  })),
}))

export const bundle_similarity_fn = async ({
  libsPath,
  signature: unknownSig,
  candidates,
  log,
  fn: fnName,
}: BundleSimFnArg): Promise<BundleSimFnReturn> => {
  // sort candidates by most likely one
  // for each candidate:
  //   match all versions against bundle
  //   keep top5, which has similarity value > 0
  //   update top5's mapping to map to real indexes from unknownSig
  //   from copy of unknownSig, remove mapped functions of top1 candidate
  //   run from beginning of for-loop with remaining unmapped functions
  const fn = returnFunctionMatchingFn(fnName)
  const mRemainingToLib = matchesToLibFactory(libsPath, fn)
  const preparedCandidates = sortBy((o) => -o.index.val, candidates).map(({ name, index }, i) => ({
    name,
    index,
    top: i + 1,
  }))

  let time_
  let done_
  const rank: rankType[] = []
  const secondary: rankType[] = []
  const later: typeof preparedCandidates = []
  let remaining: FunctionSignature[] = [...unknownSig.functionSignature]

  log.debug(
    {
      firstCandidates: preparedCandidates.length,
      functionsToMatch: remaining.length,
    },
    '>--> first candidate list run',
  )

  time_ = process.hrtime()
  for (let candidate of preparedCandidates) {
    const candLog = log.child({ candidate })
    const libNVS = await getLibNameVersionSigContents(libsPath, candidate.name)
    const shLibNVS = shuffleVersions(libNVS)

    const start = process.hrtime()
    const matches = await mRemainingToLib(candLog, remaining, shLibNVS, true)
    const end = process.hrtime(start)
    candLog.debug(
      { 'candidate-version-count': shLibNVS.length, 'candidate-time-taken': end },
      '>---> finish all versions of candidate',
    )

    const top = matches.length > 0 ? matches[0] : null

    if (top && top.similarity.val === 1) {
      rank.push({ ...candidate, matches })
      remaining = remaining.filter((v) => !top.mapping.has(v.index))
    } else {
      later.push(candidate)
    }
  }
  done_ = process.hrtime(time_)

  log.debug(
    {
      timeSpent: done_,
      secondCandidates: later.length,
      matchedInFirst: rank.length,
      functionsToMatch: remaining.length,
    },
    '>--> second candidate list run',
  )

  time_ = process.hrtime()
  for (let candidate of later) {
    const candLog = log.child({ candidate })
    const libNVS = await getLibNameVersionSigContents(libsPath, candidate.name)
    const shLibNVS = shuffleVersions(libNVS)

    const start = process.hrtime()
    const matches = await mRemainingToLib(candLog, remaining, shLibNVS)
    const end = process.hrtime(start)
    candLog.debug(
      { 'candidate-version-count': shLibNVS.length, 'candidate-time-taken': end },
      '>---> finish all versions of candidate',
    )

    const top = matches.length > 0 ? matches[0] : null

    // remark: bad idea as it is prioritizing libs sorted by name
    // So, lib starting with 'a' has higher chance of being selected
    // compared to lib starting with 'z'.
    if (top) {
      secondary.push({ ...candidate, matches })
      remaining = remaining.filter((v) => !top.mapping.has(v.index))
    }
  }
  done_ = process.hrtime(time_)

  log.debug(
    {
      timeSpent: done_,
      matchedInSecond: secondary.length,
      functionsLeftUnmatched: remaining.length,
    },
    '>--> fin both candidate runs',
  )

  return { rank: mapToArrayPairs(rank), secondary: mapToArrayPairs(secondary), remaining }
}

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
