// eslint-disable-next-line no-unused-vars
import { FunctionSignature, FunctionSignatures, isFunctionSignatures } from '../../extractStructure'
import { indexValue, jaccardIndex, similarityIndexToLib } from '../set'
import { typeErrorMsg } from './types'

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
 * @param unknownS
 * @param libS
 * @returns
 */
export function librarySimilarityByFunctionNames<
  T extends FunctionSignature[] | FunctionSignatures
>(unknownS: T, libS: T): { ourIndex: indexValue; jaccardIndex: indexValue } {
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
