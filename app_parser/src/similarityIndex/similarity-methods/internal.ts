import { SourceLocation } from 'babel-types'
import {
  FunctionSignature,
  FunctionSignatures,
  isFunctionSignatures,
  isLiteralSignatures,
  LiteralSignature,
  LiteralSignatures,
} from '../../extractStructure'
import logger from '../../utils/logger'
import { LiteralMatchingFnWrapper, MatchingFnWrapper, typeErrorMsg } from './types'

/* eslint-disable no-unused-vars */
declare const __v: LiteralSignature
declare const __w: LiteralSignatures
declare const __x: FunctionSignature
declare const __y: FunctionSignatures
declare const __z: SourceLocation
/* eslint-enable no-unused-vars */

export const provideFnSig: MatchingFnWrapper = (fn) => (log = logger, unknownS, libS) => {
  if (isFunctionSignatures(unknownS) && isFunctionSignatures(libS)) {
    return fn(log, unknownS.functionSignature, libS.functionSignature)
  } else if (Array.isArray(unknownS) && Array.isArray(libS)) {
    return fn(log, unknownS, libS)
  } else {
    throw new TypeError(typeErrorMsg)
  }
}

export const provideLitSig: LiteralMatchingFnWrapper = (fn) => (log = logger, unknownS, libS) => {
  if (isLiteralSignatures(unknownS) && isLiteralSignatures(libS)) {
    return fn(log, unknownS.literalSignature, libS.literalSignature)
  } else if (Array.isArray(unknownS) && Array.isArray(libS)) {
    return fn(log, unknownS, libS)
  } else {
    throw new TypeError(typeErrorMsg)
  }
}
