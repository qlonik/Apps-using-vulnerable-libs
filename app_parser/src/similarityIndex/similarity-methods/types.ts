import { FunctionSignature } from '../../extractStructure'
import { indexValue } from '../set'

export interface Name {
  name: string
}
export interface Prob {
  prob: indexValue
}
export interface Index {
  index: number
}
export type nameProb = Name & Prob
export type nameProbIndex = Name & Index & Prob
export type probIndex = Index & Prob

export type similarityIndexValueAndSimilarityMap = {
  similarity: indexValue
  mapping: Map<number, number>
}

export type FunctionSignatureMatched = FunctionSignature & {
  __matched?: boolean | { prob: indexValue; index: number }
}

export const typeErrorMsg = 'wrong parameters'
