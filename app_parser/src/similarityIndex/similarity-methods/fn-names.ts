import { Logger } from 'pino'
// eslint-disable-next-line no-unused-vars
import { FunctionSignature, FunctionSignatures } from '../../extractStructure'
import { jaccardLikeWithMapping, libPortionWithMapping } from '../set'
import { getFnSig } from './internal'
import { DefiniteMap, probIndex, SimMapWithConfidence } from './types'

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

/**
 * This function returns similarity metric by function names. This function computes the metric
 * using {@link libPortionWithMapping} fn.
 *
 * In detail, the algorithm does the following:
 * 1. Create a list of unique function names and mapping from 'unknown' signature array
 * 2. Create a list of unique function names and mapping from 'lib' signature array
 * 3. Compare sets using {@link libPortionWithMapping | libPortionWithMapping()}
 * 4. Restore mapping when incoming lists were not sets
 *
 * @param logS
 * @param unknownS
 * @param libS
 */
export function librarySimilarityByFunctionNames_ourIndex<
  T extends FunctionSignature[] | FunctionSignatures
>(logS: Logger, unknownS: T, libS: T): SimMapWithConfidence {
  const [log, unknown, lib] = getFnSig(logS, unknownS, libS)

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

/**
 * This function returns similarity metric by function names. This function computes the metric
 * using {@link jaccardLikeWithMapping} fn.
 *
 * In detail, the algorithm does the following:
 * 1. Create a list of unique function names and mapping from 'unknown' signature array
 * 2. Create a list of unique function names and mapping from 'lib' signature array
 * 3. Compare sets using {@link jaccardLikeWithMapping | jaccardLikeWithMapping()}
 * 4. Restore mapping when incoming lists were not sets
 *
 * @param logS
 * @param unknownS
 * @param libS
 */
export function librarySimilarityByFunctionNames_jaccardIndex<
  T extends FunctionSignature[] | FunctionSignatures
>(logS: Logger, unknownS: T, libS: T): SimMapWithConfidence {
  const [log, unknown, lib] = getFnSig(logS, unknownS, libS)

  const { set: unknownNamesSet, mapping: unknownNamesMapping } = uniqFnNamesWithMapping(unknown)
  const { set: libNamesSet, mapping: libNamesMapping } = uniqFnNamesWithMapping(lib)

  const { similarity: ourIndex, mapping: setMapping } = jaccardLikeWithMapping(
    unknownNamesSet,
    libNamesSet,
  )
  const mapping = new Map(
    [...setMapping.entries()]
      .map(([unkwnSetI, libSetI]): [number, probIndex] => [
        unknownNamesMapping.get(unkwnSetI),
        { index: libNamesMapping.get(libSetI), prob: { val: 1, num: -1, den: -1 } },
      ])
      .sort((a, b) => a[0] - b[0]),
  ) as DefiniteMap<number, probIndex>

  return { similarity: ourIndex, mapping }
}
