import { clone, findIndex, head, pullAt, sortBy } from 'lodash'
import { FunctionSignature, signatureNew } from '../../extractStructure'
import { jaccardLike } from '../set'
import { SortedLimitedList } from '../SortedLimitedList'
import {
  FunctionSignatureMatched,
  nameProbIndex,
  Prob,
  probIndex,
  similarityIndexValueAndSimilarityMap,
} from './types'

/**
 * This function produces similarity index between two signature based on the function statement
 * tokens.
 *
 * In detail, the algorithm does the following:
 * 1. Create a copy of library signature.
 * 2. Create empty array of possible function names for this unknown library.
 * 3. For each element of the unknown signature array (represents function) we do the following:
 *    a. Create SortedLimitedList (sorted in descending order by probability and
 *       limited to 100 matches).
 *    b. For each element of the copy of the library signature array (represents function) we do
 *       the following:
 *       i.  Create similarity between list of tokens of the element from the unknown signature
 *           array and element from the library signature array. The similarity is created using
 *           {@link jaccardLike | jaccardLike()}.
 *       ii. Add the similarity index into SortedLimitedList for this element of the unknown
 *           signature array.
 *    c. After creating SortedLimitedList for this unknown function from signature array, we grab
 *       top value from it.
 *    d. If the top match does not exist or if top match probability is equal to 0, then we mark
 *       this function as unmatched, by adding special dummy name '__unmatched__' into the array
 *       of possible function names. Otherwise, we add this function name into array of possible
 *       function names.
 *    e. Remove this matched function name from the copy of the library signature array.
 * 4. Sort the list of possible function names.
 * 5. Compare the list of possible function names (we just created) with the list of function names
 *    from the library signature using {@link jaccardLike | jaccardLike()}.
 * 6. Return this index from step 5 as the similarity index between unknown signature and known
 *    library signature.
 *
 * @param unknown
 * @param lib
 * @returns
 */
export const v1 = ({
  unknown: { functionSignature: unknown },
  lib: { functionSignature: lib },
}: {
  unknown: signatureNew
  lib: signatureNew
}): similarityIndexValueAndSimilarityMap => {
  let libCopy = clone(lib) as FunctionSignatureMatched[]
  // remark: first for loop
  const possibleFnNames = unknown.reduce(
    (acc: nameProbIndex[], { fnStatementTokens: toks }: FunctionSignature) => {
      if (!toks) {
        return acc
      }

      // remark: second for loop
      const topName = libCopy
        .reduce((indexes, { name, __matched = false, fnStatementTokens: libToks }, libIndex) => {
          if (!libToks || __matched) {
            return indexes
          }

          // remark: third for loop (inside jaccardLike())
          return indexes.push({ name, index: libIndex, prob: jaccardLike(toks, libToks) })
        }, new SortedLimitedList({ predicate: (o: nameProbIndex) => -o.prob.val }))
        .value()

      const topMatch = head(topName)
      if (!topMatch || topMatch.prob.val === 0) {
        const unmatched = { name: '__unmatched__', prob: { val: 1, num: -1, den: -1 }, index: -1 }
        return acc.concat(unmatched)
      }

      const { name, index, prob } = topMatch
      libCopy = libCopy.map((el, i) => (i !== index ? el : { ...el, __matched: true }))
      return acc.concat({ name, prob, index })
    },
    [] as nameProbIndex[],
  )

  const similarity = jaccardLike(possibleFnNames.map((v) => v.name), lib.map((v) => v.name))
  const mapping = possibleFnNames.reduce((acc, { index: libIndex }, unknownIndex) => {
    return libIndex === -1 ? acc : acc.set(unknownIndex, libIndex)
  }, new Map())

  return { similarity, mapping }
}

/**
 * This function produces similarity index between two signature based on the function statement
 * tokens. This function is different than {@link v1}
 * because this function takes every function from library and tries to match it to all functions
 * in the unknown signature.
 *
 * @param unknown - signature of the unknown js file from the app
 * @param lib - signature of the library
 * @returns
 */
export const v2 = ({
  unknown: { functionSignature: unknown },
  lib: { functionSignature: lib },
}: {
  unknown: { functionSignature: (FunctionSignature | FunctionSignatureMatched)[] }
  lib: signatureNew
}): similarityIndexValueAndSimilarityMap => {
  const mappedUnknownSig = lib.reduce(
    (mappedUnknownSigAcc, { fnStatementTokens: libToks }, libIndex) => {
      if (!libToks) {
        return mappedUnknownSigAcc
      }

      const topUnknownFnRanking = mappedUnknownSigAcc
        .reduce((acc, { __matched = false, fnStatementTokens: unknownToks }, unknownIndex) => {
          if (!unknownToks || __matched) {
            return acc
          }

          return acc.push({ index: unknownIndex, prob: jaccardLike(unknownToks, libToks) })
        }, new SortedLimitedList({ limit: 1, predicate: (o: probIndex) => -o.prob.val }))
        .value()

      const topUnknownFn = head(topUnknownFnRanking)
      if (!topUnknownFn || topUnknownFn.prob.val === 0) {
        return mappedUnknownSigAcc
      }

      const { index: unknownIndex, prob } = topUnknownFn
      return mappedUnknownSigAcc.map(
        (el, i) => (i !== unknownIndex ? el : { ...el, __matched: { index: libIndex, prob } }),
      )
    },
    clone(unknown) as FunctionSignatureMatched[],
  )

  const possibleFnIndexes = mappedUnknownSig.map(
    ({ __matched }) => (__matched && typeof __matched === 'object' ? __matched.index : -1),
  )

  return {
    similarity: jaccardLike(possibleFnIndexes, lib.keys()),
    // similarity: jaccardLike(possibleFnIndexes.map((v) => '' + v), Object.keys(libCopy)),
    mapping: mappedUnknownSig.reduce((acc, { __matched }, unknownIndex) => {
      return __matched && typeof __matched === 'object'
        ? acc.set(unknownIndex, __matched.index)
        : acc
    }, new Map<number, number>()),
  }
}

export const v3 = ({
  unknown: { functionSignature: unknown },
  lib: { functionSignature: lib },
}: {
  unknown: signatureNew
  lib: signatureNew
}): similarityIndexValueAndSimilarityMap => {
  type indexesProb = { unknownIndex: number; libIndex: number } & Prob
  const sll = new SortedLimitedList({ limit: Infinity, predicate: (o: indexesProb) => -o.prob.val })

  for (let [unknownIndex, { fnStatementTokens: unknownToks }] of unknown.entries()) {
    if (!unknownToks) {
      continue
    }

    for (let [libIndex, { fnStatementTokens: libToks }] of lib.entries()) {
      if (!libToks) {
        continue
      }

      const prob = jaccardLike(unknownToks, libToks)
      if (prob.val !== 0) {
        sll.push({ unknownIndex, libIndex, prob })
      }
    }
  }

  const selectedMatchesUnsorted = sll
    .value()
    .reduce((acc, { unknownIndex, libIndex }, index, arr) => {
      let foundIndex
      while (
        (foundIndex = findIndex(
          arr,
          (o: indexesProb) => o.unknownIndex === unknownIndex || o.libIndex === libIndex,
          index + 1,
        )) !== -1
      ) {
        pullAt(arr, foundIndex)
      }

      return acc.set(unknownIndex, libIndex)
    }, new Map<number, number>())

  const selectedMatches = new Map<number, number>(
    sortBy([...selectedMatchesUnsorted], ([key]) => key),
  )

  const possibleFnIndexes = unknown.map((u, i) => {
    return selectedMatches.has(i) ? selectedMatches.get(i) : -1
  })

  return {
    similarity: jaccardLike(possibleFnIndexes, lib.keys()),
    mapping: selectedMatches,
  }
}
