import { Logger } from 'pino'
// eslint-disable-next-line no-unused-vars
import { FunctionSignature, FunctionSignatures, isFunctionSignatures } from '../../extractStructure'
import logger from '../../utils/logger'
import {
  indexValue,
  jaccardIndex,
  jaccardLikeWithMapping,
  libPortionWithMapping,
  similarityIndexToLib,
} from '../set'
import { DefiniteMap, probIndex, SimMapWithConfidence, typeErrorMsg } from './types'

const uniqFnNamesWithMapping = (arr: FunctionSignature[]) =>
  arr.reduce(
    ({ set, mapping }, { name }, i) => {
      return set.includes(name)
        ? { set, mapping }
        : { set: set.concat(name), mapping: mapping.set(set.length, i) }
    },
    {
      set: [] as string[],
      mapping: new Map<number, number>() as DefiniteMap<number, number>,
    },
  )

export function librarySimilarityByFunctionNames_ourIndex<
  T extends FunctionSignature[] | FunctionSignatures
>(log: Logger = logger, unknownS: T, libS: T): SimMapWithConfidence {
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

  const { set: unknownNamesSet, mapping: unknownNamesMapping } = uniqFnNamesWithMapping(unknown)
  const { set: libNamesSet, mapping: libNamesMapping } = uniqFnNamesWithMapping(lib)

  const { similarity: ourIndex, mapping: setMapping } = libPortionWithMapping(
    unknownNamesSet,
    libNamesSet,
  )
  const mapping = new Map(
    [...setMapping.entries()].map(([unkwnSetI, libSetI]): [number, probIndex] => [
      unknownNamesMapping.get(unkwnSetI),
      { index: libNamesMapping.get(libSetI), prob: { val: 1, num: -1, den: -1 } },
    ]),
  ) as DefiniteMap<number, probIndex>

  return { similarity: ourIndex, mapping }
}

export function librarySimilarityByFunctionNames_jaccardIndex<
  T extends FunctionSignature[] | FunctionSignatures
>(log: Logger = logger, unknownS: T, libS: T): SimMapWithConfidence {
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

  const { set: unknownNamesSet, mapping: unknownNamesMapping } = uniqFnNamesWithMapping(unknown)
  const { set: libNamesSet, mapping: libNamesMapping } = uniqFnNamesWithMapping(lib)

  const { similarity: ourIndex, mapping: setMapping } = jaccardLikeWithMapping(
    unknownNamesSet,
    libNamesSet,
  )
  const mapping = new Map(
    [...setMapping.entries()].map(([unkwnSetI, libSetI]): [number, probIndex] => [
      unknownNamesMapping.get(unkwnSetI),
      { index: libNamesMapping.get(libSetI), prob: { val: 1, num: -1, den: -1 } },
    ]),
  ) as DefiniteMap<number, probIndex>

  return { similarity: ourIndex, mapping }
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
 * @param [log]
 * @param unknownS
 * @param libS
 * @returns
 */
export function librarySimilarityByFunctionNames<
  T extends FunctionSignature[] | FunctionSignatures
>(log: Logger = logger, unknownS: T, libS: T): { ourIndex: indexValue; jaccardIndex: indexValue } {
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
