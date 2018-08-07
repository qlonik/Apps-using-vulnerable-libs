import { clone, head, last, partition, pullAt } from 'lodash'
import { Logger } from 'pino'
import {
  fnNamesSplit,
  FunctionSignature,
  FunctionSignatures, // eslint-disable-line no-unused-vars
  isFunctionSignatures,
} from '../../extractStructure'
import logger from '../../utils/logger'
import { indexValue, jaccardLike } from '../set'
import { SortedLimitedList } from '../SortedLimitedList'
import { nameProbIndex, typeErrorMsg } from './types'

export function librarySimilarityByFunctionNamesAndStatementTokens<
  T extends FunctionSignature[] | FunctionSignatures
>(log: Logger = logger, unknownS: T, libS: T): indexValue {
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

  const anonFnPartitioner = (s: FunctionSignature) => last(fnNamesSplit(s.name)) === '[anonymous]'
  const [unknownAnonFnSigs, unknownNamedFnSigs] = partition(unknown, anonFnPartitioner)
  const [libAnonFnSigs, libNamedFnSigs] = partition(lib, anonFnPartitioner)

  type nameProbIndexOrigI = nameProbIndex & { origIndex: number }

  const libAnonFnSigsCopy = clone(libAnonFnSigs).map((s: FunctionSignature, i) => ({ s, i }))
  // remark: first for loop
  const possibleMatches = unknownAnonFnSigs.reduce(
    (acc, { fnStatementTokens: toks }) => {
      // remark: second for loop
      const topMatches = libAnonFnSigsCopy
        .reduce((sll, { i: origIndex, s: { name, fnStatementTokens: libToks } }, index) => {
          // remark: threshold can go here
          // remark: third for loop (inside jaccardLike())
          return sll.push({ name, index, origIndex, prob: jaccardLike(toks, libToks) })
        }, new SortedLimitedList({ predicate: (o: nameProbIndexOrigI) => -o.prob.val }))
        .value()

      const topMatch = head(topMatches)
      if (!topMatch || topMatch.prob.val === 0) {
        const unmatched = { name: '__unmatched__', index: -1, prob: { val: 1, num: -1, den: -1 } }
        return acc.concat(unmatched)
      }

      const { name, index, origIndex, prob } = topMatch
      pullAt(libAnonFnSigsCopy, index)
      return acc.concat({ name, prob, index: origIndex })
    },
    [] as nameProbIndex[],
  )

  const unknownNames = ([] as (string | number)[])
    .concat(unknownNamedFnSigs.map((v) => v.name))
    .concat(possibleMatches.map((v) => v.index))
  const libNames = ([] as (string | number)[])
    .concat(libNamedFnSigs.map((v) => v.name))
    .concat(libAnonFnSigs.map((_, i) => i))

  return jaccardLike(unknownNames, libNames)
}
