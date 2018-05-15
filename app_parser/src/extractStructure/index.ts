import { Comment as BabelComment, CommentBlock, CommentLine, Node as BabelNode } from 'babel-types'
import { parse } from 'babylon'
import { flatMap, Many } from 'lodash'
import { stdoutLog } from '../utils/logger'
import { fnNodeFilter, Signature } from './nodeFilters/allFnsAndNames'
import {
  collapseLiteralValsTree,
  literalValuesFilter,
  SignatureLiteral,
} from './nodeFilters/literalValues'
import { rnDeclareFnFilter } from './nodeFilters/rnDeclareFn'
import { TreePath, visitNodes } from './visitNodes'

const CONCAT_FNS_WITH = ':>>:'
const NAMESPACE = 'x.Struct'
const log = stdoutLog(NAMESPACE)

export const fnNamesConcat = (p: string, f: string): string => {
  const st = p.length ? CONCAT_FNS_WITH : ''
  return p.concat(st).concat(f)
}

export const fnNamesSplit = (n: string): string[] => {
  return n.split(CONCAT_FNS_WITH)
}

export const fnOnlyTreeCreator = visitNodes<FunctionSignature>({ fn: fnNodeFilter })
export const rnDeclareFns = visitNodes({ fn: rnDeclareFnFilter })
export const literalValues = visitNodes({ fn: literalValuesFilter })

const collapseFnNamesTree = (
  tree: TreePath<FunctionSignature>[],
  fnNameSoFar: string = '',
): FunctionSignature[] => {
  if (tree.length === 0) {
    return []
  }

  return flatMap(tree, (fnDesc: TreePath<FunctionSignature>): Many<FunctionSignature> => {
    if (fnDesc.data === null) {
      if (fnDesc.c) {
        return collapseFnNamesTree(fnDesc.c)
      }

      return []
    }

    const fnName = fnNamesConcat(fnNameSoFar, fnDesc.data.name)
    const { loc, fnStatementTypes, fnStatementTokens } = fnDesc.data
    const treeElem: FunctionSignature = {
      type: 'fn',
      name: fnName,
      loc,
      fnStatementTypes,
      fnStatementTokens,
    }

    if (!fnDesc.c) {
      return treeElem
    }
    return [treeElem].concat(collapseFnNamesTree(fnDesc.c, fnName))
  }).sort((a, b) => a.name.localeCompare(b.name))
}

// todo: refactor existing types rather than alias them
export type FunctionSignature = Signature
export type LiteralSignature = SignatureLiteral
export type CommentSignature = string | string[]

export type FunctionSignatures = { functionSignature: FunctionSignature[] }
export type LiteralSignatures = { literalSignature: LiteralSignature[] }
export type Comments = { comments: CommentSignature[] }

export const isFunctionSignatures = (o: any): o is FunctionSignatures => {
  return typeof o === 'object' && 'functionSignature' in o && Array.isArray(o.functionSignature)
}
export const isLiteralSignatures = (o: any): o is LiteralSignatures => {
  return typeof o === 'object' && 'literalSignature' in o && Array.isArray(o.literalSignature)
}
export const isComments = (o: any): o is Comments => {
  return typeof o === 'object' && 'comments' in o && Array.isArray(o.comments)
}

export type signatureNew = FunctionSignatures & LiteralSignatures
export type signatureWithComments = signatureNew & Comments
export type rnSignatureNew = signatureNew & {
  id: number | string
}

const mapBabelComments = (
  comment: BabelComment | CommentBlock | CommentLine,
): string | string[] => {
  return 'type' in comment && comment.type === 'CommentBlock'
    ? comment.value.split('\n')
    : comment.value
}

const _extractStructure = function({ content }: { content: BabelNode }): signatureNew {
  const functionSignature = collapseFnNamesTree(fnOnlyTreeCreator(content))
  const literalSignature = collapseLiteralValsTree(literalValues(content))

  return { functionSignature, literalSignature }
}

/**
 * @throws if parsing is unsuccessful
 */
export const extractStructure = async function({
  content,
}: {
  content: string
}): Promise<signatureWithComments> {
  const { program, comments } = parse(content)
  const signature = _extractStructure({ content: program })

  return { ...signature, comments: comments.map(mapBabelComments) }
}

export const extractReactNativeStructure = async function({
  content,
}: {
  content: string
}): Promise<rnSignatureNew[]> {
  const { program } = parse(content)
  return rnDeclareFns(program).map(({ data }) => {
    const { id, factory } = data
    const structure = _extractStructure({ content: factory })
    return { id, ...structure }
  })
}
