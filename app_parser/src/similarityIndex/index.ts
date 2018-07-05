import { sortBy } from 'lodash'
import {
  FunctionSignature,
  LiteralSignatures,
  signatureNew,
  signatureWithComments,
} from '../extractStructure'
import {
  getLibLiteralSig,
  getLibNameVersions,
  getLibNameVersionSigContents,
  libNameVersion,
  libNameVersionSigFile,
} from '../parseLibraries'
import { resolveAllOrInParallel } from '../utils'
import { indexValue, isSubset, jaccardIndex } from './set'
import { librarySimilarityByFunctionNamesAndStatementTokens } from './similarity-methods'
import { v6 } from './similarity-methods/fn-st-tokens'
import { probIndex, SimMapWithConfidence } from './similarity-methods/types'
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
      // fnNamesSim: librarySimilarityByFunctionNames(unknown, lib),
      // fnStTokensSim: librarySimilarityByFunctionStatementTokens(unknown, lib),
      // fnStTypesSim: librarySimilarityByFunctionStatementTypes(unknown, lib),
      namesTokens: librarySimilarityByFunctionNamesAndStatementTokens(unknown, lib),
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

export type matchedLib = libNameVersionSigFile & SimMapWithConfidence
export type rankType = {
  name: string
  candidateIndex: indexValue
  candidateTop: number
  matches: matchedLib[]
}
export const bundle_similarity_fn = async (
  unknownSig: signatureWithComments,
  candidates: candidateLib[],
  libsPath: string,
  fn: (a: FunctionSignature[], b: FunctionSignature[]) => SimMapWithConfidence = v6,
): Promise<{ rank: rankType[]; remaining: FunctionSignature[] }> => {
  // sort candidates by most likely one
  // for each candidate:
  //   match all versions against bundle
  //   keep top5, which has similarity value > 0
  //   update top5's mapping to map to real indexes from unknownSig
  //   from copy of unknownSig, remove mapped functions of top1 candidate
  //   run from beginning of for-loop with remaining unmapped functions
  return sortBy(candidates, (o) => -o.index.val).reduce(
    async (acc, { name, index: candidateIndex }, i) => {
      const { rank, remaining } = await acc

      const matches = (await getLibNameVersionSigContents(libsPath, name))
        .reduce(
          (acc, { name, version, file, signature: { functionSignature } }) =>
            acc.push({ name, version, file, ...fn(remaining, functionSignature) }),
          new SortedLimitedList<matchedLib>({ limit: 5, predicate: (o) => -o.similarity.val }),
        )
        .value()
        .filter((o) => o.similarity.val > 0)
        .map((v) => ({
          ...v,
          mapping: [...v.mapping.entries()]
            .map(([index, pi]): [number, probIndex] => [remaining[index].index, pi])
            .sort((a, b) => a[0] - b[0])
            .reduce((acc, [key, pi]) => acc.set(key, pi), new Map() as typeof v.mapping),
        }))

      const top = matches.length > 0 ? matches[0].mapping : null
      const reduced = top === null ? remaining : remaining.filter(({ index }) => !top.has(index))

      return {
        rank: rank.concat({ name, candidateIndex, candidateTop: i + 1, matches }),
        remaining: reduced,
      }
    },
    Promise.resolve({
      rank: [] as rankType[],
      remaining: [...unknownSig.functionSignature] as FunctionSignature[],
    }),
  )
}

export type candidateLib = { name: string; index: indexValue }
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
