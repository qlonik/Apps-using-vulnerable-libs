import { FunctionSignature } from '../../extractStructure'
import { jaccardLikeWithMapping, libPortionWithMapping } from '../set'
import { provideFnSig } from './internal'
import { DefiniteMap, probIndex } from './types'

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

export const librarySimilarityByFunctionNames_ourIndex = provideFnSig(
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
   * @param log
   * @param unknown
   * @param lib
   */
  function FnNames_our(log, unknown, lib) {
    const { set: unknownNamesSet, mapping: unknownNamesMapping } = uniqFnNamesWithMapping(unknown)
    const { set: libNamesSet, mapping: libNamesMapping } = uniqFnNamesWithMapping(lib)

    const { similarity: ourIndex, mapping: setMapping } = libPortionWithMapping(
      unknownNamesSet,
      libNamesSet,
    )
    const mapping = new Map(
      [...setMapping.entries()].map(
        ([unkwnSetI, libSetI]): [number, probIndex] => [
          unknownNamesMapping.get(unkwnSetI),
          { index: libNamesMapping.get(libSetI), prob: { val: 1, num: -1, den: -1 } },
        ],
      ),
    ) as DefiniteMap<number, probIndex>

    return { similarity: ourIndex, mapping }
  },
)

export const librarySimilarityByFunctionNames_jaccardIndex = provideFnSig(
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
   * @param log
   * @param unknown
   * @param lib
   */
  function FnNames_jaccard(log, unknown, lib) {
    const { set: unknownNamesSet, mapping: unknownNamesMapping } = uniqFnNamesWithMapping(unknown)
    const { set: libNamesSet, mapping: libNamesMapping } = uniqFnNamesWithMapping(lib)

    const { similarity: ourIndex, mapping: setMapping } = jaccardLikeWithMapping(
      unknownNamesSet,
      libNamesSet,
    )
    const mapping = new Map(
      [...setMapping.entries()]
        .map(
          ([unkwnSetI, libSetI]): [number, probIndex] => [
            unknownNamesMapping.get(unkwnSetI),
            { index: libNamesMapping.get(libSetI), prob: { val: 1, num: -1, den: -1 } },
          ],
        )
        .sort((a, b) => a[0] - b[0]),
    ) as DefiniteMap<number, probIndex>

    return { similarity: ourIndex, mapping }
  },
)
