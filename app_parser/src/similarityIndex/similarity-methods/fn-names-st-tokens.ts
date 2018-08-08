import { head, last } from 'lodash'
import { Logger } from 'pino'
import {
  fnNamesSplit,
  FunctionSignature,
  FunctionSignatures,
  isFunctionSignatures,
} from '../../extractStructure'
import logger from '../../utils/logger'
import { jaccardLike, jaccardLikeWithMapping } from '../set'
import { SortedLimitedList } from '../SortedLimitedList'
import {
  DefiniteMap,
  FunctionSignatureMatched,
  nameProbIndex,
  probIndex,
  SimMapWithConfidence,
  typeErrorMsg,
} from './types'

const anonPartitionWithMap = (arr: FunctionSignature[]) =>
  arr.reduce(
    ({ anon, anonMap, named, namedMap }, fnSig, i) =>
      last(fnNamesSplit(fnSig.name)) === '[anonymous]'
        ? { anon: anon.concat(fnSig), anonMap: anonMap.set(anon.length, i), named, namedMap }
        : { anon, anonMap, named: named.concat(fnSig), namedMap: namedMap.set(named.length, i) },
    {
      anon: [] as FunctionSignature[],
      anonMap: new Map() as DefiniteMap<number, number>,
      named: [] as FunctionSignature[],
      namedMap: new Map() as DefiniteMap<number, number>,
    },
  )

export function librarySimilarityByFunctionNamesAndStatementTokens<
  T extends FunctionSignature[] | FunctionSignatures
>(log: Logger = logger, unknownS: T, libS: T): SimMapWithConfidence {
  let unknown: FunctionSignature[]
  let lib: FunctionSignature[]
  if (isFunctionSignatures(unknownS) && isFunctionSignatures(libS)) {
    unknown = unknownS.functionSignature
    lib = libS.functionSignature
  } else if (Array.isArray(unknownS) && Array.isArray(libS)) {
    unknown = unknownS
    lib = libS
  } else {
    throw new TypeError(typeErrorMsg)
  }

  const unknownPart = anonPartitionWithMap(unknown)
  const libPart = anonPartitionWithMap(lib)

  const libAnonFns = libPart.anon as FunctionSignatureMatched[]
  // remark: first for loop
  const possibleMatches = unknownPart.anon.reduce(
    (acc, { fnStatementTokens: toks }) => {
      // remark: second for loop
      const topMatches = libAnonFns
        .reduce((sll, { name, __matched = false, fnStatementTokens: libToks }, index) => {
          return __matched
            ? sll
            : // remark: threshold can go here
              // remark: third for loop (inside jaccardLike())
              sll.push({ name, index, prob: jaccardLike(toks, libToks) })
        }, new SortedLimitedList({ predicate: (o: nameProbIndex) => -o.prob.val }))
        .value()

      const topMatch = head(topMatches)
      if (!topMatch || topMatch.prob.val === 0) {
        const unmatched = { name: '__unmatched__', index: -1, prob: { val: 1, num: -1, den: -1 } }
        return acc.concat(unmatched)
      }

      libAnonFns[topMatch.index] = { ...libAnonFns[topMatch.index], __matched: true }
      return acc.concat(topMatch)
    },
    [] as nameProbIndex[],
  )

  const sizeOfUnknownNamed = unknownPart.named.length
  const sizeOfLibNamed = libPart.named.length

  const unknownFns = ([] as (string | number)[])
    .concat(unknownPart.named.map((v) => v.name))
    .concat(possibleMatches.map((v) => v.index))
  const libFns = ([] as (string | number)[])
    .concat(libPart.named.map((v) => v.name))
    .concat(libPart.anon.map((_, i) => i))

  const { similarity, mapping: nonFormatMap } = jaccardLikeWithMapping(unknownFns, libFns)

  const mapping = new Map(
    [...nonFormatMap]
      .map(([unkwnI, libI]): [number, probIndex] => {
        let unknownIndex
        let index
        let prob = { val: 1, num: -1, den: -1 }

        if (unkwnI < sizeOfUnknownNamed) {
          unknownIndex = unknownPart.namedMap.get(unkwnI)
        } else {
          const i = unkwnI - sizeOfUnknownNamed
          unknownIndex = unknownPart.anonMap.get(i)
          prob = possibleMatches[i].prob
        }

        if (libI < sizeOfLibNamed) {
          index = libPart.namedMap.get(libI)
        } else {
          index = libPart.anonMap.get(libI - sizeOfLibNamed)
        }

        return [unknownIndex, { index, prob }]
      })
      .sort((a, b) => a[0] - b[0]),
  ) as DefiniteMap<number, probIndex>

  return { similarity, mapping }
}
