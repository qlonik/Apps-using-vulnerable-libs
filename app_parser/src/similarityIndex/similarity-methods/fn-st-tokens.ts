import { Fraction } from 'fraction.js'
import { clone, head, sortBy } from 'lodash'
import { FunctionSignature } from '../../extractStructure'
import { FractionToIndexValue } from '../fraction'
import {
  indexValue,
  jaccardLike,
  jaccardLikeNumbers,
  jaccardLikeStrings,
  libPortionIndexes,
  weightedMapIndex,
} from '../set'
import { SortedLimitedList } from '../sorted-limited-list'
import { provideFnSig } from './internal'
import { DefiniteMap, FunctionSignatureMatched, nameProbIndex, Prob, probIndex } from './types'

export const v1 = provideFnSig(
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
   * 5. Compare the list of possible function names (we just created) with the list of function
   *    names from the library signature using {@link jaccardLike | jaccardLike()}.
   * 6. Return this index from step 5 as the similarity index between unknown signature and known
   *    library signature.
   *
   * @param log - logger instance
   * @param unknown
   * @param lib
   * @returns
   */
  function v1(log, unknown, lib) {
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
  },
)

export const v2 = provideFnSig(
  /**
   * This function produces similarity index between two signature based on the function statement
   * tokens. This function is different than {@link v1}
   * because this function takes every function from library and tries to match it to all functions
   * in the unknown signature.
   *
   * @param log - logger instance
   * @param unknown - signature of the unknown js file from the app
   * @param lib - signature of the library
   * @returns
   */
  function v2(log, unknown, lib) {
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
  },
)

export const v3 = provideFnSig(function v3(log, unknown, lib) {
  type indexesProb = { unknownIndex: number; libIndex: number } & Prob
  const sll = new SortedLimitedList({ limit: Infinity, predicate: (o: indexesProb) => -o.prob.val })

  for (let [unknownIndex, { fnStatementTokens: unknownToks }] of unknown.entries()) {
    for (let [libIndex, { fnStatementTokens: libToks }] of lib.entries()) {
      // remark: threshold can go here
      const prob = jaccardLikeStrings(unknownToks, libToks)
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

  const mapping = new Map(
    selectedMatchesUnsorted
      .sort((a, b) => a[0] - b[0])
      .map(([i, index, prob]): [number, probIndex] => [i, { index, prob }]),
  ) as DefiniteMap<number, probIndex>

  const possibleFnIndexes = unknown.map((u, i) => (mapping.has(i) ? mapping.get(i).index : -1))
  const libFnIndexes = lib.map((_, i) => i)
  const similarity = jaccardLikeNumbers(possibleFnIndexes, libFnIndexes)

  return { similarity, mapping }
})

export const v4 = provideFnSig(
  /**
   * This function calculates similarity index in the same way as {@link v2}. However, it takes into
   * account the value of each similarity index between functions that got matched.
   */
  function v4(log, unknown, lib) {
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
  },
)

export const v5 = provideFnSig(
  /**
   * This function calculates similarity index in the same way as {@link v2}.
   * However, it only uses functions which got matched to other functions with jaccard index =1.
   */
  function v5(log, unknown, lib) {
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
  },
)

export const v6 = provideFnSig(
  /**
   * This function calculates mapping between unknown signature and known lib signature in the same
   * way as {@link v5} does. However, this function uses {@link libPortion}
   * @param log
   * @param unknown
   * @param lib
   */
  function v6(log, unknown, lib) {
    const fnStart = process.hrtime()

    const v6log = log.child({ name: 'fn-st-toks-v6' })
    const map = new Map() as DefiniteMap<number, probIndex>
    const unkwn = [] as { matched: boolean; el: FunctionSignature }[]
    const uPos = [] as number[]
    const lPos = [] as number[]
    let jlTime = 0
    let jlCount = 0

    for (let i = 0, len = unknown.length; i < len; i++) {
      unkwn[i] = { matched: false, el: unknown[i] }
      uPos[i] = -1
    }

    const compStart = process.hrtime()
    for (let libIndex = 0, lLen = lib.length; libIndex < lLen; libIndex++) {
      lPos[libIndex] = libIndex

      const { fnStatementTokens: libToks } = lib[libIndex]
      const sll = new SortedLimitedList<probIndex>({ limit: 1, predicate: (o) => -o.prob.val })

      for (let unknownIndex = 0, uLen = unkwn.length; unknownIndex < uLen; unknownIndex++) {
        const { matched, el: { fnStatementTokens: unknownToks } } = unkwn[unknownIndex]
        if (!matched) {
          const start = process.hrtime()
          const prob = jaccardLikeStrings(unknownToks, libToks)
          const end = process.hrtime(start)

          jlTime += end[0] * 1e9 + end[1]
          jlCount += 1

          sll.push({ index: unknownIndex, prob })
        }
      }

      const topMatch = sll.value()[0]
      if (topMatch && topMatch.prob.val === 1) {
        map.set(topMatch.index, { index: libIndex, prob: topMatch.prob })
        unkwn[topMatch.index].matched = true
        uPos[topMatch.index] = libIndex
      }
    }
    const compEnd = process.hrtime(compStart)

    const portionStart = process.hrtime()
    const sim = libPortionIndexes(uPos, lPos)
    const portionEnd = process.hrtime(portionStart)

    const fnEnd = process.hrtime(fnStart)
    const fnTime = fnEnd[0] * 1e9 + fnEnd[1]
    const tComp = compEnd[0] * 1e9 + compEnd[1]
    const tLibPortion = portionEnd[0] * 1e9 + portionEnd[1]
    v6log.debug(
      {
        fnTime,
        tComp,
        tCompProp: tComp / fnTime,
        tLibPortion,
        jlTime,
        jlCount,
        libLen: lib.length,
        unkLen: unknown.length,
      },
      '>-----> fn-st-toks-v6 timings',
    )

    return { similarity: sim, mapping: map }
  },
)
