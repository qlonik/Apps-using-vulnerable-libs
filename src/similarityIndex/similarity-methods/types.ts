import { Logger } from 'pino'
import {
  FunctionSignature,
  FunctionSignatures,
  LiteralSignature,
  LiteralSignatures,
} from '../../extractStructure'
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

export interface DefiniteMap<K, V> extends Map<K, V> {
  get(key: K): V
}

export type similarityIndexValueAndSimilarityMap = {
  similarity: indexValue
  mapping: DefiniteMap<number, number>
}

export interface SimMapWithConfidence {
  similarity: indexValue
  mapping: DefiniteMap<number, probIndex>
}

export type FunctionSignatureMatched = FunctionSignature & {
  __matched?: boolean | probIndex
}

export type MatchingFn = <T extends FunctionSignature[] | FunctionSignatures>(
  l: Logger | undefined,
  unknown: T,
  lib: T,
) => SimMapWithConfidence
export type MatchingFnWrapper = (
  fn: (log: Logger, u: FunctionSignature[], l: FunctionSignature[]) => ReturnType<MatchingFn>,
) => MatchingFn

export type LiteralMatchingFn = <T extends LiteralSignature[] | LiteralSignatures>(
  l: Logger | undefined,
  unknown: T,
  lib: T,
) => SimMapWithConfidence
export type LiteralMatchingFnWrapper = (
  fn: (log: Logger, u: LiteralSignature[], l: LiteralSignature[]) => ReturnType<LiteralMatchingFn>,
) => LiteralMatchingFn

export const typeErrorMsg = 'wrong parameters'
