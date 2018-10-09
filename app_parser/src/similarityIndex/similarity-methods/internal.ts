import { SourceLocation } from 'babel-types'
import { Logger } from 'pino'
import {
  FunctionSignature,
  FunctionSignatures,
  isFunctionSignatures,
  isLiteralSignatures,
  LiteralSignature,
  LiteralSignatures,
} from '../../extractStructure'
import { assertNever } from '../../utils'
import logger from '../../utils/logger'
import {
  librarySimilarityByFunctionNames_jaccardIndex,
  librarySimilarityByFunctionNames_ourIndex,
} from './fn-names'
import { librarySimilarityByFunctionNamesAndStatementTokens } from './fn-names-st-tokens'
import { v1, v2, v3, v4, v5, v6 } from './fn-st-tokens'
import { librarySimilarityByFunctionStatementTypes } from './fn-st-types'
import { librarySimilarityByLiteralValues } from './lit-values'
import { LiteralMatchingFn, MatchingFn, typeErrorMsg } from './types'

/* eslint-disable no-unused-vars */
declare const __v: LiteralSignature
declare const __w: LiteralSignatures
declare const __x: FunctionSignature
declare const __y: FunctionSignatures
declare const __z: SourceLocation
/* eslint-enable no-unused-vars */

export const provideFnSig = (
  fn: (
    log: Logger,
    unknown: FunctionSignature[],
    lib: FunctionSignature[],
  ) => ReturnType<MatchingFn>,
): MatchingFn => (log = logger, unknownS, libS) => {
  if (isFunctionSignatures(unknownS) && isFunctionSignatures(libS)) {
    return fn(log, unknownS.functionSignature, libS.functionSignature)
  } else if (Array.isArray(unknownS) && Array.isArray(libS)) {
    return fn(log, unknownS, libS)
  } else {
    throw new TypeError(typeErrorMsg)
  }
}

export const provideLitSig = (
  fn: (
    log: Logger,
    unknown: LiteralSignature[],
    lib: LiteralSignature[],
  ) => ReturnType<LiteralMatchingFn>,
): LiteralMatchingFn => (log = logger, unknownS, libS) => {
  if (isLiteralSignatures(unknownS) && isLiteralSignatures(libS)) {
    return fn(log, unknownS.literalSignature, libS.literalSignature)
  } else if (Array.isArray(unknownS) && Array.isArray(libS)) {
    return fn(log, unknownS, libS)
  } else {
    throw new TypeError(typeErrorMsg)
  }
}

export enum FN_MATCHING_METHODS_ENUM {
  'fn-names-jaccard',
  'fn-names-our',
  'fn-names-st-toks',
  'fn-st-toks-v1',
  'fn-st-toks-v2',
  'fn-st-toks-v3',
  'fn-st-toks-v4',
  'fn-st-toks-v5',
  'fn-st-toks-v6',
  'fn-st-types',
}
export type FN_MATCHING_METHODS_TYPE = keyof typeof FN_MATCHING_METHODS_ENUM
export const FN_MATCHING_METHODS = Object.values(FN_MATCHING_METHODS_ENUM).filter(
  (n) => typeof n === 'string',
) as FN_MATCHING_METHODS_TYPE[]

export const returnFunctionMatchingFn = function(
  fn: undefined | FN_MATCHING_METHODS_TYPE,
): MatchingFn {
  return fn === undefined
    ? /* default */ v6
    : fn === 'fn-names-jaccard'
      ? librarySimilarityByFunctionNames_jaccardIndex
      : fn === 'fn-names-our'
        ? librarySimilarityByFunctionNames_ourIndex
        : fn === 'fn-names-st-toks'
          ? librarySimilarityByFunctionNamesAndStatementTokens
          : fn === 'fn-st-toks-v1'
            ? v1
            : fn === 'fn-st-toks-v2'
              ? v2
              : fn === 'fn-st-toks-v3'
                ? v3
                : fn === 'fn-st-toks-v4'
                  ? v4
                  : fn === 'fn-st-toks-v5'
                    ? v5
                    : fn === 'fn-st-toks-v6'
                      ? v6
                      : fn === 'fn-st-types'
                        ? librarySimilarityByFunctionStatementTypes
                        : assertNever(fn)
}

export enum LIT_MATCHING_METHODS_ENUM {
  'lit-vals',
}
export type LIT_MATCHING_METHODS_TYPE = keyof typeof LIT_MATCHING_METHODS_ENUM
export const LIT_MATCHING_METHODS = Object.values(LIT_MATCHING_METHODS_ENUM).filter(
  (n) => typeof n === 'string',
) as LIT_MATCHING_METHODS_TYPE[]

export const returnLiteralMatchingFn = function(
  fn: undefined | LIT_MATCHING_METHODS_TYPE,
): LiteralMatchingFn {
  return fn === undefined
    ? librarySimilarityByLiteralValues
    : fn === 'lit-vals' ? librarySimilarityByLiteralValues : assertNever(fn)
}
