import { pathExists, readJSON } from 'fs-extra'
import { clone, head, last, partition, pullAt } from 'lodash'
import { join } from 'path'
import {
  fnNamesSplit,
  FunctionSignature,
  LiteralSignature,
  signatureNew,
} from '../extractStructure'
import {
  getLibNames,
  getLibNameVersions,
  getLibNameVersionSigContents,
  libNameVersion,
  libPath,
} from '../parseLibraries'
import { LIB_LITERAL_SIGNATURE_FILE } from '../parseLibraries/constants'
import { resolveAllOrInParallel } from '../utils'
import { indexValue, isSubset, jaccardIndex, jaccardLike, similarityIndexToLib } from './set'
import { SortedLimitedList } from './SortedLimitedList'

export type Similarity = libNameVersion & {
  file: string
  similarity: indexValue
}

export type NewSimilarity = libNameVersion & {
  file: string
  fnNamesSim?: {
    ourIndex?: indexValue
    jaccardIndex?: indexValue
  }
  fnStTokensSim?: indexValue
  fnStTypesSim?: indexValue
  namesTokens?: indexValue
}

/**
 * This function returns similarity metric by function names. It produces two indexes - one is our
 * own type and another is jaccard.
 *
 * In detail, the algorithm does the following:
 * 1. Create a set of guessed function names that are present in unknown signature array
 * 2. Create a set of guessed function names that are present in library signature array
 * 3. Compare sets from previous steps using {@link similarityIndexToLib | similarityIndexToLib()}
 * 4. Compare sets from steps 1,2 using {@link jaccardIndex | jaccardIndex()}
 *
 * Note, set here is a list of unique items.
 *
 * @param unknown
 * @param lib
 * @returns
 */
export const librarySimilarityByFunctionNames = ({
  unknown: { functionSignature: unknown },
  lib: { functionSignature: lib },
}: {
  unknown: signatureNew
  lib: signatureNew
}): { ourIndex: indexValue; jaccardIndex: indexValue } => {
  //todo
  const unknownNamesSet = new Set(unknown.map((s) => s.name))
  const libNamesSet = new Set(lib.map((s) => s.name))

  const ourVal = similarityIndexToLib(libNamesSet, unknownNamesSet)
  const jaccardVal = jaccardIndex(libNamesSet, unknownNamesSet)

  return {
    ourIndex: ourVal,
    jaccardIndex: jaccardVal,
  }
}

type nameProb = { name: string; prob: indexValue }
type nameProbIndex = nameProb & { index: number }
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
export const librarySimilarityByFunctionStatementTokens = ({
  unknown: { functionSignature: unknown },
  lib: { functionSignature: lib },
}: {
  unknown: signatureNew
  lib: signatureNew
}): indexValue => {
  const libCopy = clone(lib)
  // remark: first for loop
  const possibleFnNames = unknown.reduce(
    (acc: nameProb[], { fnStatementTokens: toks }: FunctionSignature) => {
      if (!toks) {
        return acc
      }

      // remark: second for loop
      const topName = libCopy
        .reduce((indexes, { name, fnStatementTokens: libToks }: FunctionSignature, libIndex) => {
          if (!libToks) {
            return indexes
          }

          // remark: third for loop (inside jaccardLike())
          return indexes.push({ name, index: libIndex, prob: jaccardLike(toks, libToks) })
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

export const librarySimilarityByFunctionStatementTypes = ({
  unknown: { functionSignature: unknown },
  lib: { functionSignature: lib },
}: {
  unknown: signatureNew
  lib: signatureNew
}): indexValue => {
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

export const librarySimilarityByFunctionNamesAndStatementTokens = ({
  unknown: { functionSignature: unknown },
  lib: { functionSignature: lib },
}: {
  unknown: signatureNew
  lib: signatureNew
}): indexValue => {
  const anonFnPartitioner = (s: FunctionSignature) => last(fnNamesSplit(s.name)) === '[anonymous]'
  const [unknownAnonFnSigs, unknownNamedFnSigs] = partition(unknown, anonFnPartitioner)
  const [libAnonFnSigs, libNamedFnSigs] = partition(lib, anonFnPartitioner)

  type nameProbIndexOrigI = nameProbIndex & { origIndex: number }

  const libAnonFnSigsCopy = clone(libAnonFnSigs).map((s: FunctionSignature, i) => ({ s, i }))
  // remark: first for loop
  const possibleMatches = unknownAnonFnSigs.reduce(
    (acc, { fnStatementTokens: toks }) => {
      if (!toks) {
        return acc
      }

      // remark: second for loop
      const topMatches = libAnonFnSigsCopy
        .reduce((sll, { i: origIndex, s: { name, fnStatementTokens: libToks } }, index) => {
          if (!libToks) {
            return sll
          }

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

/**
 * This function compares one unknown signature to one library+version pair and returns 4 types of
 * similarities between unknown signature and signatures of the library+version. Library+version
 * may contain more than one main file, and therefore it might have more than one signature, so
 * this function returns arrays of similarities for each of found signatures for the particular
 * library+version pair.
 *
 * In detail, the algorithm does the following:
 * 1. Load json files from 'sigs/' folder of that library+version, which is where precomputed
 * signatures are stored. If there is no such folder or there are no files in the folder, then
 * empty array of similarities is returned.
 * 2. For each file in the folder, create a similarity object, which tracks name of the library,
 * version of the library, file with signature in the library, and four similarity types. Four
 * similarity types are created by calling corresponding functions -
 * {@link librarySimilarityByFunctionNames}, {@link librarySimilarityByFunctionStatementTokens},
 * and {@link librarySimilarityByFunctionStatementTypes}.
 *
 * @param unknown
 * @param libsPath
 * @param name
 * @param version
 * @returns
 */
export const getSimilarityToLib = async ({
  signature: unknown,
  libsPath,
  name,
  version,
}: {
  signature: signatureNew
  libsPath: string
  name: string
  version: string
}): Promise<NewSimilarity[]> => {
  const signatures = await getLibNameVersionSigContents(libsPath, name, version)
  return signatures.map(({ file, signature: lib }) => {
    return {
      name,
      version,
      file,
      fnNamesSim: librarySimilarityByFunctionNames({ unknown, lib }),
      fnStTokensSim: librarySimilarityByFunctionStatementTokens({ unknown, lib }),
      fnStTypesSim: librarySimilarityByFunctionStatementTypes({ unknown, lib }),
      namesTokens: librarySimilarityByFunctionNamesAndStatementTokens({ unknown, lib }),
    }
  })
}

/**
 * This function computes the similarity of the given signature to signatures of all libraries.
 *
 * In detail, the algorithm does the following:
 * 1. Create 4 SortedLimitedLists (all sorted in descending order by the value of the similarity
 * index, all limited to 100 values (default)) for 4 different similarity types we have.
 * 2. Create list of all library+version pairs that exist in our database of libraries.
 * 3. For each library+version pair, create similarity between unknown signature and known
 * signature of the library+version pair (it is precomputed) by calling
 * {@link getSimilarityToLib|getSimilarityToLib()}. The similarity is essentially an array of 4
 * different similarity types.
 * 4. Push each of 4 different similarity types from previous step into corresponding
 * SortedLimitedList.
 *
 * Note, there are 4 different similarities that are mentioned - first, is the one using
 * {@link librarySimilarityByFunctionNames | our metric on fn names}, second using
 * {@link librarySimilarityByFunctionNames | jaccard metric on fn names}, third using
 * {@link librarySimilarityByFunctionStatementTokens | fn comparison metric by fn statement tokens},
 * and fourth using
 * {@link librarySimilarityByFunctionStatementTypes | fn comparison metric by fn statement types}.
 * Each of these simlarity types are described near corresponding function.
 *
 * @param signature
 * @param libsPath
 * @returns
 */
export type SimilarityTypes =
  | 'fnNamesOur'
  | 'fnNamesJaccard'
  | 'fnStTokens'
  | 'fnStTypes'
  | 'namesTokens'
export type SimilarityToLibs = Partial<Record<SimilarityTypes, Similarity[]>>
export const getSimilarityToLibs = async ({
  signature,
  libsPath,
  names,
  versions,
}: {
  signature: signatureNew
  libsPath: string
  names?: string | string[]
  versions?: string | string[]
}): Promise<SimilarityToLibs> => {
  const predicate = (s: Similarity) => -s.similarity.val
  const sllOfSims: Record<SimilarityTypes, SortedLimitedList<Similarity>> = {
    fnNamesOur: new SortedLimitedList({ predicate }),
    fnNamesJaccard: new SortedLimitedList({ predicate }),
    fnStTokens: new SortedLimitedList({ predicate }),
    fnStTypes: new SortedLimitedList({ predicate }),
    namesTokens: new SortedLimitedList({ predicate }),
  }

  let libDescr = await getLibNameVersions(libsPath)
  if (names) {
    const namesArr = Array.isArray(names) ? names : [names]
    libDescr = libDescr.filter(({ name }) => namesArr.includes(name))
  }
  if (versions) {
    const versionsArr = Array.isArray(versions) ? versions : [versions]
    libDescr = libDescr.filter(({ version }) => versionsArr.includes(version))
  }

  const lazySimilarityPromises = libDescr.map(({ name, version }) => {
    return async () => {
      const sims = await getSimilarityToLib({ signature, libsPath, name, version })
      sims.forEach(
        ({
          name,
          version,
          file,
          fnNamesSim: { ourIndex = null, jaccardIndex = null } = {},
          fnStTokensSim = null,
          fnStTypesSim = null,
          namesTokens = null,
        }) => {
          if (ourIndex) {
            sllOfSims.fnNamesOur.push({ name, version, file, similarity: ourIndex })
          }
          if (jaccardIndex) {
            sllOfSims.fnNamesJaccard.push({ name, version, file, similarity: jaccardIndex })
          }
          if (fnStTokensSim) {
            sllOfSims.fnStTokens.push({ name, version, file, similarity: fnStTokensSim })
          }
          if (fnStTypesSim) {
            sllOfSims.fnStTypes.push({ name, version, file, similarity: fnStTypesSim })
          }
          if (namesTokens) {
            sllOfSims.namesTokens.push({ name, version, file, similarity: namesTokens })
          }
        },
      )
    }
  })
  await resolveAllOrInParallel(lazySimilarityPromises)

  const result = {} as SimilarityToLibs
  for (let [name, sll] of Object.entries(sllOfSims)) {
    const val = sll.value()
    if (val.length > 0) {
      result[name as SimilarityTypes] = val
    }
  }
  return result
}

export const getCandidateLibs = async ({
  signature,
  libsPath,
}: {
  signature: signatureNew
  libsPath: string
}): Promise<{ name: string; index: indexValue }[]> => {
  const appLitSig = new Set(signature.literalSignature)

  if (appLitSig.size === 0) {
    return []
  }

  const nameSigsPromises = (await getLibNames(libsPath)).map(({ name }) => async () => {
    const sigPath = join(libPath(libsPath, name), LIB_LITERAL_SIGNATURE_FILE)
    const sigContent = (await pathExists(sigPath)) ? await readJSON(sigPath) : []
    return { name, sig: new Set(sigContent) as Set<LiteralSignature> }
  })
  const nameSigs = await resolveAllOrInParallel(nameSigsPromises)
  const candidates = nameSigs
    .filter(({ sig }) => sig.size > 0)
    .filter(({ sig }) => isSubset(appLitSig, sig))
    .map(({ name }) => ({ name, index: { val: 1, num: -1, den: -1 } }))

  if (candidates.length > 0) {
    return candidates
  }

  // probably a bad idea VVV
  const sll = new SortedLimitedList({
    predicate: (o: { name: string; index: indexValue }) => -o.index.val,
    limit: 10,
  })
  for (let { name, sig } of nameSigs) {
    sll.push({ name, index: jaccardIndex(appLitSig, sig) })
  }

  return sll.value().filter(({ index }) => index.val !== 0)
}
