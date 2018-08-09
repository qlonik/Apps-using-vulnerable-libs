import { SourceLocation } from 'babel-types'
import { Logger } from 'pino'
import { FunctionSignature, FunctionSignatures, isFunctionSignatures } from '../../extractStructure'
import logger from '../../utils/logger'
import { typeErrorMsg } from './types'

/* eslint-disable no-unused-vars */
declare const __x: FunctionSignature
declare const __y: FunctionSignatures
declare const __z: SourceLocation
/* eslint-enable no-unused-vars */

export const getFnSig = <T extends FunctionSignature[] | FunctionSignatures>(
  log: Logger | undefined = logger,
  unknownS: T,
  libS: T,
): [Logger, FunctionSignature[], FunctionSignature[]] => {
  if (isFunctionSignatures(unknownS) && isFunctionSignatures(libS)) {
    return [log, unknownS.functionSignature, libS.functionSignature]
  } else if (Array.isArray(unknownS) && Array.isArray(libS)) {
    return [log, unknownS, libS]
  } else {
    throw new TypeError(typeErrorMsg)
  }
}
