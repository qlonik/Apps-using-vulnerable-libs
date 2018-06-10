import { Fraction } from 'fraction.js'
import { clone, head, sortBy } from 'lodash'
import {
  FunctionSignature,
  FunctionSignatures, // eslint-disable-line no-unused-vars
  isFunctionSignatures,
} from '../../extractStructure'
import { FractionToIndexValue } from '../fraction'
import { indexValue, jaccardLike, weightedMapIndex } from '../set'
import { SortedLimitedList } from '../SortedLimitedList'
import {
  DefiniteMap,
  FunctionSignatureMatched,
  nameProbIndex,
  Prob,
  probIndex,
  SimMapWithConfidence,
  typeErrorMsg,
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
 * @param unknownS
 * @param libS
 * @returns
 */
export function v1<T extends FunctionSignature[] | FunctionSignatures>(
  unknownS: T,
  libS: T,
): SimMapWithConfidence {
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

  let libCopy = clone(lib) as FunctionSignatureMatched[]
  // remark: first for loop
  const possibleFnNames = unknown.reduce(
    (acc: nameProbIndex[], { fnStatementTokens: toks }: FunctionSignature) => {
      // remark: second for loop
      const topName = libCopy
        .reduce((indexes, { name, __matched = false, fnStatementTokens: libToks }, libIndex) => {
          return __matched
            ? indexes
            : // remark: threshold can go here
              // remark: third for loop (inside jaccardLike())
              indexes.push({ name, index: libIndex, prob: jaccardLike(toks, libToks) })
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
  const mapping = possibleFnNames.reduce(
    (acc, { index, prob }, unknownIndex) => {
      return index === -1 ? acc : acc.set(unknownIndex, { index, prob })
    },
    new Map() as DefiniteMap<number, probIndex>,
  )

  return { similarity, mapping }
}

/**
 * This function produces similarity index between two signature based on the function statement
 * tokens. This function is different than {@link v1}
 * because this function takes every function from library and tries to match it to all functions
 * in the unknown signature.
 *
 * @param unknownS - signature of the unknown js file from the app
 * @param libS - signature of the library
 * @returns
 */
export function v2<T extends FunctionSignature[] | FunctionSignatures>(
  unknownS: T,
  libS: T,
): SimMapWithConfidence {
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

  const mappedUnknownSig = lib.reduce(
    (mappedUnknownSigAcc, { fnStatementTokens: libToks }, libIndex) => {
      const topUnknownFnRanking = mappedUnknownSigAcc
        .reduce((acc, { __matched = false, fnStatementTokens: unknownToks }, unknownIndex) => {
          return __matched
            ? acc
            : // remark: threshold can go here
              acc.push({ index: unknownIndex, prob: jaccardLike(unknownToks, libToks) })
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
    mapping: mappedUnknownSig.reduce(
      (acc, { __matched }, unknownIndex) => {
        return __matched && typeof __matched === 'object' ? acc.set(unknownIndex, __matched) : acc
      },
      new Map() as DefiniteMap<number, probIndex>,
    ),
  }
}

export function v3<T extends FunctionSignature[] | FunctionSignatures>(
  unknownS: T,
  libS: T,
): SimMapWithConfidence {
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

  type indexesProb = { unknownIndex: number; libIndex: number } & Prob
  const sll = new SortedLimitedList({ limit: Infinity, predicate: (o: indexesProb) => -o.prob.val })

  for (let [unknownIndex, { fnStatementTokens: unknownToks }] of unknown.entries()) {
    for (let [libIndex, { fnStatementTokens: libToks }] of lib.entries()) {
      // remark: threshold can go here
      const prob = jaccardLike(unknownToks, libToks)
      if (prob.val !== 0) {
        sll.push({ unknownIndex, libIndex, prob })
      }
    }
  }

  const selectedMatchesUnsorted = [] as [number, number, indexValue][]
  const usedUnknownI = new Set<number>()
  const usedLibI = new Set<number>()
  for (let { unknownIndex, libIndex, prob } of sll.value()) {
    if (!usedUnknownI.has(unknownIndex) && !usedLibI.has(libIndex)) {
      usedUnknownI.add(unknownIndex)
      usedLibI.add(libIndex)
      selectedMatchesUnsorted.push([unknownIndex, libIndex, prob])
    }
  }

  const selectedMatches = sortBy(selectedMatchesUnsorted, ([key]) => key).reduce(
    (map, [unknownIndex, libIndex, prob]) => {
      return map.set(unknownIndex, { index: libIndex, prob })
    },
    new Map() as DefiniteMap<number, probIndex>,
  )

  const possibleFnIndexes = unknown.map((u, i) => {
    return selectedMatches.has(i) ? selectedMatches.get(i).index : -1
  })

  return {
    similarity: jaccardLike(possibleFnIndexes, lib.keys()),
    mapping: selectedMatches,
  }
}

/**
 * This function calculates similarity index in the same way as {@link v2}. However, it takes into
 * account the value of each similarity index between functions that got matched.
 */
export function v4<T extends FunctionSignature[] | FunctionSignatures>(
  unknownS: T,
  libS: T,
): SimMapWithConfidence {
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

  const { map: mapArr } = lib.reduce(
    ({ map, unkwn }, { fnStatementTokens: libToks }, libIndex) => {
      const topMatch = unkwn
        .reduce((sll, { i, el: { fnStatementTokens: unknownToks } }) => {
          return sll.push({ index: i, prob: jaccardLike(unknownToks, libToks) })
        }, new SortedLimitedList({ limit: 1, predicate: (o: probIndex) => -o.prob.val }))
        .value()
        .shift()

      if (!topMatch || topMatch.prob.val === 0) {
        return { map, unkwn }
      }

      const { index: unknownIndex, prob } = topMatch
      return {
        map: map.concat([[unknownIndex, libIndex, prob]]),
        unkwn: unkwn.filter(({ i }) => i !== unknownIndex),
      }
    },
    {
      map: [] as [number, number, indexValue][],
      unkwn: unknown.map((el, i) => ({ el, i })),
    },
  )

  const map = sortBy(mapArr, ([key]) => key).reduce(
    (acc, [i, index, prob]) => acc.set(i, { index, prob }),
    new Map() as DefiniteMap<number, probIndex>,
  )

  const libFnIndexes = lib.map((_, i) => i)
  const possibleUnknownFnIndexes = unknown.map((_, i) => (map.has(i) ? map.get(i).index : -1))

  const jl = jaccardLike(possibleUnknownFnIndexes, libFnIndexes)
  const sim =
    jl.den === 0
      ? jl
      : FractionToIndexValue(new Fraction(jl.num, jl.den).mul(weightedMapIndex(map)))

  return { similarity: sim, mapping: map }
}

/**
 * This function calculates similarity index in the same way as {@link v2}.
 * However, it only uses functions which got matched to other functions with jaccard index =1.
 */
export function v5<T extends FunctionSignature[] | FunctionSignatures>(
  unknownS: T,
  libS: T,
): SimMapWithConfidence {
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

  const { map: mapArr } = lib.reduce(
    ({ map, unkwn }, { fnStatementTokens: libToks }, libIndex) => {
      const topMatch = unkwn
        .reduce((sll, { i, el: { fnStatementTokens: unknownToks } }) => {
          return sll.push({ index: i, prob: jaccardLike(unknownToks, libToks) })
        }, new SortedLimitedList({ limit: 1, predicate: (o: probIndex) => -o.prob.val }))
        .value()
        .shift()

      if (topMatch && topMatch.prob.val === 1) {
        const { index: unknownIndex, prob } = topMatch
        return {
          map: map.concat([[unknownIndex, libIndex, prob]]),
          unkwn: unkwn.filter(({ i }) => i !== unknownIndex),
        }
      }

      return { map, unkwn }
    },
    {
      map: [] as [number, number, indexValue][],
      unkwn: unknown.map((el, i) => ({ el, i })),
    },
  )

  const map = sortBy(mapArr, ([key]) => key).reduce(
    (acc, [i, index, prob]) => acc.set(i, { index, prob }),
    new Map() as DefiniteMap<number, probIndex>,
  )

  const libFnIndexes = lib.map((_, i) => i)
  const possibleUnknownFnIndexes = unknown.map((_, i) => (map.has(i) ? map.get(i).index : -1))

  const sim = jaccardLike(possibleUnknownFnIndexes, libFnIndexes)

  return { similarity: sim, mapping: map }
}
