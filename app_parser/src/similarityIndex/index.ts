import { pathExists, readdir } from 'fs-extra'
import { flatten, sortBy, unzip } from 'lodash'
import { join } from 'path'
import { Signature } from '../extractStructure'
import { getNamesVersions, libDesc } from '../parseLibraries'
import { chunk, resolveParallelGroups } from '../utils'
import {
  indexValue,
  jaccardIndex,
  makeSetOutOfArray,
  makeSetOutOfFilePath,
  similarityIndexToLib,
} from '../utils/set'


export type Similarity = libDesc & {
  file: string,
  similarity: indexValue,
}

export type JaccardSimilarity = libDesc & {
  file: string,
  jaccardIndex: indexValue,
}

type mergedSimilarity = Similarity & JaccardSimilarity

export type getSimilaritiesOpts = {
  signature: Signature,
  libsPath: string,
}

export async function getSimilarities(
  { signature, libsPath }: getSimilaritiesOpts): Promise<{ ourSim: Similarity[], jaccardSim: JaccardSimilarity[] }> {

  const libDescriptions = await getNamesVersions(libsPath)
  const unknownSigSet = makeSetOutOfArray(signature)
  const similarLazyPromises = libDescriptions.map(({ name, version }) => {
    return async (): Promise<mergedSimilarity[]> => {
      const sigFolder = join(libsPath, name, version, 'sigs')

      if (!await pathExists(sigFolder)) {
        return <mergedSimilarity[]>[]
      }

      const simFiles = await readdir(sigFolder)
      const similarityPromises = simFiles.map(async (file: string) => {
        const libSigSet = await makeSetOutOfFilePath(join(sigFolder, file))
        return {
          name,
          version,
          file,
          similarity: similarityIndexToLib(libSigSet, unknownSigSet),
          jaccardIndex: jaccardIndex(libSigSet, unknownSigSet),
        }
      })
      return Promise.all(similarityPromises)
    }
  })
  const similar = await resolveParallelGroups(chunk(similarLazyPromises, 10))

  const twoSimilaritiesZip: [Similarity, JaccardSimilarity][] = flatten(similar)
    .map(({
      name,
      version,
      file,
      similarity,
      jaccardIndex,
    }: mergedSimilarity): [Similarity, JaccardSimilarity] => {

      return [
        { name, version, file, similarity },
        { name, version, file, jaccardIndex },
      ]
    })
  const [similarity, jaccardSimilarity] =
    <[Similarity[], JaccardSimilarity[]]>unzip(twoSimilaritiesZip)

  return {
    ourSim: sortBy(similarity, (v: Similarity) => -v.similarity.val),
    jaccardSim: sortBy(jaccardSimilarity, (v: JaccardSimilarity) => -v.jaccardIndex.val)
  }
}
