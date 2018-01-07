import { pathExists, readdir, readJSON } from 'fs-extra'
import { clone, head, pullAt } from 'lodash'
import { join } from 'path'
import { Signature } from '../extractStructure'
import { getNamesVersions, libDesc } from '../parseLibraries'
import { resolveAllOrInParallel } from '../utils'
import { stdoutLog } from '../utils/logger'
import {
  indexValue,
  jaccardIndex,
  jaccardLike,
  similarityIndexToLib,
} from './set'
import { SortedLimitedList } from './SortedLimitedList'


export type Similarity = libDesc & {
  file: string,
  similarity: indexValue,
}

export type NewSimilarity = libDesc & {
  file: string,
  fnNamesSim: {
    ourIndex: indexValue,
    jaccardIndex: indexValue,
  },
  fnStTokensSim: indexValue,
  fnStTypesSim: indexValue,
}


const NAMESPACE = 'similarity'
const log = stdoutLog(NAMESPACE)

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
export const librarySimilarityByFunctionNames = (
  { unknown, lib }: {
    unknown: Signature[],
    lib: Signature[],
  }): { ourIndex: indexValue, jaccardIndex: indexValue } => {

  //todo
  const unknownNamesSet = new Set(unknown.map(s => s.name))
  const libNamesSet = new Set(lib.map(s => s.name))

  const ourVal = similarityIndexToLib(libNamesSet, unknownNamesSet)
  const jaccardVal = jaccardIndex(libNamesSet, unknownNamesSet)

  return {
    ourIndex: ourVal,
    jaccardIndex: jaccardVal,
  }
}

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
 *    d. If the top match does not exist or if top match probability is equal to 0, then we skip
 *       this unknown function. This function is unmatched. Otherwise, we add this function name
 *       into array of possible function names.
 *    e. Remove this matched function name from the copy of the library signature array.
 * 4. Sort the list of possible function names.
 * 5. Compare the list of possible function names (we just created) with the list of function names
 *    from the library signature using {@link jaccardLike | jaccardLike()}.
 * 6. Return this index from step 5 as the similarity index between unknown signature and known
 *    library signature.
 *
 * @param unknown
 * @param lib
 * @param name
 * @param version
 * @param file
 * @returns
 */
export const librarySimilarityByFunctionStatementTokens = (
  { unknown, lib }: {
    unknown: Signature[],
    lib: Signature[],
  },
  { name, version, file }: {
    name?: string,
    version?: string,
    file?: string,
  } = {}): indexValue => {

  type nameProb = { name: string, prob: indexValue }
  const libCopy = clone(lib)
  // remark: first for loop
  const possibleFnNames = unknown
    .reduce((acc: nameProb[], { fnStatementTokens: toks }: Signature, unknownIndex) => {
      if (!toks) {
        return acc
      }

      // remark: second for loop
      const topName = libCopy
        .reduce((indexes, { name, fnStatementTokens: libToks }: Signature, libIndex) => {
          if (!libToks) {
            return indexes
          }

          // remark: third for loop (inside jaccardLike())
          return indexes.push({ name, index: libIndex, prob: jaccardLike(toks, libToks) })
        }, new SortedLimitedList({ predicate: (o: nameProb & { index: number }) => -o.prob.val }))
        .value()

      // log('toks: %o', toks)
      // log('top indexes:\n%i\n%i\n%i', topName[0], topName[1], topName[2])

      const topMatch = head(topName)

      if (!topMatch || topMatch.prob.val === 0) {
        return acc
      }

      const { name, index, prob } = topMatch
      pullAt(libCopy, index)
      return acc.concat({ name, prob })
    }, <nameProb[]>[])

  // const similarityToLib = jaccardIndex(
  //   new Set(possibleFnNames.map(v => v.name)),
  //   new Set(lib.map(v => v.name)),
  // )
  const similarityToLib = jaccardLike(
    possibleFnNames.map(v => v.name),
    lib.map(v => v.name),
  )

  // log('similarity of unknown lib to known lib: %o', similarityToLib)
  if (possibleFnNames.length) {
  //   log(stripIndents`
  //     **** %o %o %o
  //     -- unknown sig:
  //       %i
  //     -- lib sig:
  //       %i
  //     -- possible fn names:
  //       %i
  //     `, name, version, file, unknown, lib, possibleFnNames)
  }
  return similarityToLib
}

export const librarySimilarityByFunctionStatementTypes = (
  { unknown, lib }: {
    unknown: Signature[],
    lib: Signature[],
  }): indexValue => {
  //todo
  return { val: 0, num: -1, den: -1 }
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
export const getSimilarityToLib = async (
  { signature: unknown, libsPath, name, version }: {
    signature: Signature[],
    libsPath: string,
    name: string,
    version: string,
  }): Promise<NewSimilarity[]> => {

  const sigsPath = join(libsPath, name, version, 'sigs')
  if (!await pathExists(sigsPath)) {
    return []
  }
  const sigFilePaths = (await readdir(sigsPath)).sort()
  const sigsProm = sigFilePaths.map((sigFile) => async () => {
    return {
      file: sigFile,
      signature: <Signature[]>await readJSON(join(sigsPath, sigFile)),
    }
  })
  const signatures = await resolveAllOrInParallel(sigsProm)

  return signatures.map(({ file, signature: lib }) => {
    return {
      name,
      version,
      file,
      fnNamesSim: librarySimilarityByFunctionNames({ unknown, lib }),
      fnStTokensSim: librarySimilarityByFunctionStatementTokens({ unknown, lib },
        { name, version, file }),
      fnStTypesSim: librarySimilarityByFunctionStatementTypes({ unknown, lib }),
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
export const getSimilarityToLibs = async (
  { signature, libsPath }: {
    signature: Signature[],
    libsPath: string,
  }) => {

  const predicate = (s: Similarity) => -s.similarity.val
  // const libDescr = await getNamesVersions(libsPath)
  const libDescr = [{ name: 'jquery', version: '2.1.1' }]
  const { fnNamesOur, fnNamesJaccard, fnStTokens, fnStTypes } = await libDescr
    .reduce(async (acc, { name, version }) => {
      const { fnNamesOur, fnNamesJaccard, fnStTokens, fnStTypes } = await acc
      ;(await getSimilarityToLib({ signature, libsPath, name, version }))
        .forEach(({
          name,
          version,
          file,
          fnNamesSim: { ourIndex, jaccardIndex },
          fnStTokensSim,
          fnStTypesSim,
        }) => {

          fnNamesOur.push({ name, version, file, similarity: ourIndex })
          fnNamesJaccard.push({ name, version, file, similarity: jaccardIndex })
          fnStTokens.push({ name, version, file, similarity: fnStTokensSim })
          fnStTypes.push({ name, version, file, similarity: fnStTypesSim })
        })

      return { fnNamesOur, fnNamesJaccard, fnStTokens, fnStTypes }
    }, Promise.resolve({
      fnNamesOur: new SortedLimitedList({ predicate }),
      fnNamesJaccard: new SortedLimitedList({ predicate }),
      fnStTokens: new SortedLimitedList({ predicate }),
      fnStTypes: new SortedLimitedList({ predicate }),
    }))

  return {
    fnNamesOur: fnNamesOur.value(),
    fnNamesJaccard: fnNamesJaccard.value(),
    fnStTokens: fnStTokens.value(),
    fnStTypes: fnStTypes.value(),
  }
}
