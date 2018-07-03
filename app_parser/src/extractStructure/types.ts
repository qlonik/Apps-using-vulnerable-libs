import { Signature } from './nodeFilters/allFnsAndNames'
import { SignatureLiteral } from './nodeFilters/literalValues'

// todo: refactor existing types rather than alias them
export type FunctionSignature = Signature
export type LiteralSignature = SignatureLiteral
export type CommentSignature = string | string[]

export type FunctionSignatures = { functionSignature: FunctionSignature[] }
export const isFunctionSignatures = (o: any): o is FunctionSignatures => {
  return typeof o === 'object' && 'functionSignature' in o && Array.isArray(o.functionSignature)
}

export type LiteralSignatures = { literalSignature: LiteralSignature[] }
export const isLiteralSignatures = (o: any): o is LiteralSignatures => {
  return typeof o === 'object' && 'literalSignature' in o && Array.isArray(o.literalSignature)
}

export type Comments = { comments: CommentSignature[] }
export const isComments = (o: any): o is Comments => {
  return typeof o === 'object' && 'comments' in o && Array.isArray(o.comments)
}

export type signatureNew = FunctionSignatures & LiteralSignatures
export type signatureWithComments = signatureNew & Comments
export type rnSignatureNew = signatureNew & {
  id: number | string
}
