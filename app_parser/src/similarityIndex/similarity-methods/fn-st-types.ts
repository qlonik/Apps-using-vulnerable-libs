import { clone, head } from 'lodash'
import { jaccardLikeStrings } from '../set'
import { SortedLimitedList } from '../SortedLimitedList'
import { provideFnSig } from './internal'
import {
  DefiniteMap,
  FunctionSignatureMatched,
  nameProbIndex,
  probIndex,
  SimMapWithConfidence,
} from './types'

export const librarySimilarityByFunctionStatementTypes = provideFnSig(function FnStTypes(
  log,
  unknown,
  lib,
): SimMapWithConfidence {
  const libCopy = clone(lib) as FunctionSignatureMatched[]
  // remark: first for loop
  const possibleFnNames = unknown.reduce(
    (acc: nameProbIndex[], { fnStatementTypes: types }) => {
      // remark: second for loop
      const topName = libCopy
        .reduce((indexes, { name, __matched = false, fnStatementTypes: libTypes }, libIndex) => {
          return __matched
            ? indexes
            : // remark: threshold can go here
              // remark: third for loop (inside jaccardLike())
              indexes.push({ name, index: libIndex, prob: jaccardLikeStrings(types, libTypes) })
        }, new SortedLimitedList({ predicate: (o: nameProbIndex) => -o.prob.val }))
        .value()

      const topMatch = head(topName)
      if (!topMatch || topMatch.prob.val === 0) {
        const unmatched = { name: '__unmatched__', prob: { val: 1, num: -1, den: -1 }, index: -1 }
        return acc.concat(unmatched)
      }

      const { name, index, prob } = topMatch
      libCopy[index] = { ...libCopy[index], __matched: true }
      return acc.concat({ name, prob, index })
    },
    [] as nameProbIndex[],
  )

  const similarity = jaccardLikeStrings(possibleFnNames.map((v) => v.name), lib.map((v) => v.name))
  const mapping = possibleFnNames.reduce(
    (acc, { index, prob }, unknownIndex) => {
      return index === -1 ? acc : acc.set(unknownIndex, { index, prob })
    },
    new Map() as DefiniteMap<number, probIndex>,
  )

  return { similarity, mapping }
})
