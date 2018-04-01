import { pathExists, readJSON } from 'fs-extra'
import { clone, head, sortBy } from 'lodash'
import { join } from 'path'
import { FunctionSignature, LiteralSignature, signatureNew } from '../extractStructure'
import {
  getLibNames,
  getLibNameVersions,
  getLibNameVersionSigContents,
  libNameVersion,
  libNameVersionSigFile,
  libPath,
} from '../parseLibraries'
import { LIB_LITERAL_SIGNATURE_FILE } from '../parseLibraries/constants'
import { resolveAllOrInParallel } from '../utils'
import { indexValue, isSubset, jaccardIndex, jaccardLike } from './set'
import {
  librarySimilarityByFunctionNamesAndStatementTokens,
  librarySimilarityByFunctionStatementTokens,
  librarySimilarityByFunctionStatementTokens_v2,
} from './similarity-methods'
import {
  FunctionSignatureMatched,
  similarityIndexValueAndSimilarityMap,
} from './similarity-methods/types'
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
      // fnNamesSim: librarySimilarityByFunctionNames({ unknown, lib }),
      // fnStTokensSim: librarySimilarityByFunctionStatementTokens({ unknown, lib }),
      // fnStTypesSim: librarySimilarityByFunctionStatementTypes({ unknown, lib }),
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

export const getBundleSimilarityToLibs = async ({
  signature: unknown,
  candidates,
  libsPath,
}: {
  signature: signatureNew
  candidates: candidateLib[]
  libsPath: string
}) => {
  let unknownCopy = clone(unknown)

  type candidatesSim = {
    candidate: string
    similarity: Similarity[]
  }
  const sortedCandidates = sortBy(candidates, (o) => -o.index.val)
  return await sortedCandidates.reduce(async (candProm, candidate) => {
    type matchedLib = libNameVersionSigFile & similarityIndexValueAndSimilarityMap

    const cand = await candProm
    const libVerSigs = await getLibNameVersionSigContents(libsPath, candidate.name)

    const topThree = libVerSigs
      .reduce((sll, { name, version, file, signature: lib }) => {
        const { similarity, mapping } = librarySimilarityByFunctionStatementTokens_v2({
          unknown: unknownCopy,
          lib,
        })

        return sll.push({ name, version, file, similarity, mapping } as matchedLib)
      }, new SortedLimitedList<matchedLib>({ limit: 3, predicate: (o) => -o.similarity.val }))
      .value()

    const topOne = head(topThree)
    if (topOne) {
      unknownCopy.functionSignature = unknownCopy.functionSignature.map((el, i):
        | FunctionSignature
        | FunctionSignatureMatched => {
        return topOne.mapping.has(i) ? { ...el, __matched: true } : el
      })
    }

    return cand.concat({ candidate: candidate.name, similarity: topThree })
  }, Promise.resolve([] as candidatesSim[]))
}

export type candidateLib = { name: string; index: indexValue }
export const getCandidateLibs = async ({
  signature,
  libsPath,
  opts: { limit = undefined } = {},
}: {
  signature: { literalSignature: LiteralSignature[] }
  libsPath: string
  opts?: { limit?: number }
}): Promise<candidateLib[]> => {
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
    limit,
  })
  for (let { name, sig } of nameSigs) {
    sll.push({ name, index: jaccardIndex(appLitSig, sig) })
  }

  return sll.value().filter(({ index }) => index.val !== 0)
}
