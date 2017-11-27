import { pathExists, readJSON } from 'fs-extra'
import { flatten, sortBy } from 'lodash';
import { join } from 'path'
import { Signature } from '../extractStructure'
import { getNamesVersions, libDesc } from '../parseLibraries'
import { chunk, resolveParallelGroups } from '../utils'
import { myWriteJSON } from '../utils/files'
import {
  indexValue,
  makeSetOutOfArray,
  makeSetOutOfFilePath,
  similarityIndexToLib,
} from '../utils/set'


export type Similarity = libDesc & {
  file: string,
  similarity: indexValue,
}

export type getSimilaritiesOpts = {
  signature: Signature,
  libsPath: string,
}

export async function getSimilarities(
  { signature, libsPath }: getSimilaritiesOpts): Promise<Similarity[]> {

  const libDescriptions = await getNamesVersions(libsPath)
  const unknownSigSet = makeSetOutOfArray(signature)
  // : (() => Promise<Similarity[]>)[]
  const similarLazyPromises = libDescriptions.map(({ name, version }) => {
    return async () => {
      const sim: Similarity[] = []
      const libPath = join(libsPath, name, version)

      const lib = join(libPath, 'libDesc.sig.json')
      if (await pathExists(lib)) {
        sim.push({
          name,
          version,
          file: 'libDesc.js',
          similarity: similarityIndexToLib(await makeSetOutOfFilePath(lib), unknownSigSet),
        })
      }
      const min = join(libPath, 'libDesc.min.sig.json')
      if (await pathExists(min)) {
        sim.push({
          name,
          version,
          file: 'libDesc.min.js',
          similarity: similarityIndexToLib(await makeSetOutOfFilePath(min), unknownSigSet),
        })
      }

      return sim
    }
  })
  const similar = await resolveParallelGroups(chunk(similarLazyPromises, 10))

  return sortBy(flatten(similar), (v: Similarity) => -v.similarity.val)
}

export type getSimilaritiesFromPathOpts = {
  unknownLibPath: string,
  libsPath: string,
}

export async function getSimilaritiesFromPath(
  { unknownLibPath, libsPath }: getSimilaritiesFromPathOpts) {
  const signature = await readJSON(join(unknownLibPath, 'fnSignature.json'))
  const similarities = await getSimilarities({ libsPath, signature })
  await myWriteJSON({ file: join(unknownLibPath, 'similarity.json'), content: similarities })
  return similarities
}
