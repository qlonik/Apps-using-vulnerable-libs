import { clone, head, pullAt } from 'lodash'
import {
  FunctionSignature,
  FunctionSignatures, // eslint-disable-line no-unused-vars
  isFunctionSignatures,
} from '../../extractStructure'
import { indexValue, jaccardLike } from '../set'
import { SortedLimitedList } from '../SortedLimitedList'
import { nameProb, nameProbIndex, typeErrorMsg } from './types'

export function librarySimilarityByFunctionStatementTypes<
  T extends FunctionSignature[] | FunctionSignatures
>(unknownS: T, libS: T): indexValue {
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

  const libCopy = clone(lib)
  // remark: first for loop
  const possibleFnNames = unknown.reduce(
    (acc: nameProb[], { fnStatementTypes: types }: FunctionSignature) => {
      if (!types) {
        return acc
      }

      // remark: second for loop
      const topName = libCopy
        .reduce((indexes, { name, fnStatementTypes: libTypes }: FunctionSignature, libIndex) => {
          if (!libTypes) {
            return indexes
          }

          // remark: third for loop (inside jaccardLike())
          return indexes.push({ name, index: libIndex, prob: jaccardLike(types, libTypes) })
        }, new SortedLimitedList({ predicate: (o: nameProbIndex) => -o.prob.val }))
        .value()

      const topMatch = head(topName)
      if (!topMatch || topMatch.prob.val === 0) {
        const unmatched = { name: '__unmatched__', prob: { val: 1, num: -1, den: -1 } }
        return acc.concat(unmatched)
      }

      const { name, index, prob } = topMatch
      pullAt(libCopy, index)
      return acc.concat({ name, prob })
    },
    [] as nameProb[],
  )

  return jaccardLike(possibleFnNames.map((v) => v.name), lib.map((v) => v.name))
}
