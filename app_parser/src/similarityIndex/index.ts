import { pathExists, readdir, readJSON } from 'fs-extra'
import { flatten, sortBy, unzip } from 'lodash'
import { join } from 'path'
import { Signature } from '../extractStructure'
import { getNamesVersions, libDesc } from '../parseLibraries'
import { chunk, resolveParallelGroups } from '../utils'
import { indexValue, jaccardIndex, makeSetOutOfArray, similarityIndexToLib, } from '../utils/set'


export type Similarity = libDesc & {
  file: string,
  similarity: indexValue,
}

export type JaccardSimilarity = libDesc & {
  file: string,
  jaccardIndex: indexValue,
}

type mergedSimilarity = Similarity & JaccardSimilarity

export async function getSimilarities(
  { signature, libsPath }: {
    signature: Signature[],
    libsPath: string,
  }): Promise<{ ourSim: Similarity[], jaccardSim: JaccardSimilarity[] }> {

  const libDescriptions = await getNamesVersions(libsPath)
  const unknownFnNamesSet = makeSetOutOfArray(signature.map(v => v.name))
  const similarLazyPromises = libDescriptions.map(({ name, version }) => {
    return async (): Promise<mergedSimilarity[]> => {
      const sigFolder = join(libsPath, name, version, 'sigs')

      if (!await pathExists(sigFolder)) {
        return <mergedSimilarity[]>[]
      }

      const simFiles = await readdir(sigFolder)
      const similarityPromises = simFiles.map(async (file: string) => {
        const libSignature: Signature[] = await readJSON(join(sigFolder, file))
        const libFnNamesSet = makeSetOutOfArray(libSignature.map(v => v.name))
        return {
          name,
          version,
          file,
          similarity: similarityIndexToLib(libFnNamesSet, unknownFnNamesSet),
          jaccardIndex: jaccardIndex(libFnNamesSet, unknownFnNamesSet),
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
