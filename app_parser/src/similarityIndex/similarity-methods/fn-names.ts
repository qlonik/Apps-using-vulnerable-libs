import { signatureNew } from '../../extractStructure'
import { indexValue, jaccardIndex, similarityIndexToLib } from '../set'

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
