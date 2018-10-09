import { isFunctionSignatures, isLiteralSignatures } from '../../extractStructure'
import logger from '../../utils/logger'
import { LiteralMatchingFnWrapper, MatchingFnWrapper, typeErrorMsg } from './types'

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
