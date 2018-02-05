import { Node as BabelNode } from 'babel-types'
import { parse } from 'babylon'
import { compact, flatMap, Many } from 'lodash'
import { resolveAllOrInParallel } from '../utils'
import { stdoutLog } from '../utils/logger'
import { fnNodeFilter, Signature } from './nodeFilters/allFnsAndNames'
import {
  collapseLiteralValsTree,
  literalValuesFilter,
  SignatureLiteral,
} from './nodeFilters/literalValues'
import { rnDeclareFnFilter } from './nodeFilters/rnDeclareFn'
import { TreePath, visitNodes } from './visitNodes'


export { Signature }

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

export const fnOnlyTreeCreator = visitNodes<Signature>({ fn: fnNodeFilter })
export const rnDeclareFns = visitNodes({ fn: rnDeclareFnFilter })
export const literalValues = visitNodes({ fn: literalValuesFilter })

const collapseFnNamesTree = (
  tree: TreePath<Signature>[],
  fnNameSoFar: string = ''): Signature[] => {

  if (!tree.length) {
    return []
  }

  return flatMap(tree, (fnDesc: TreePath<Signature>): Many<Signature> => {
    if (fnDesc.data === null) {
      if (fnDesc.c) {
        return collapseFnNamesTree(fnDesc.c)
      }

      return []
    }

    const fnName = fnNamesConcat(fnNameSoFar, fnDesc.data.name)
    const { fnStatementTypes, fnStatementTokens } = fnDesc.data
    const treeElem: Signature = { type: 'fn', name: fnName, fnStatementTypes, fnStatementTokens }

    if (!fnDesc.c) {
      return treeElem
    }
    return [treeElem].concat(collapseFnNamesTree(fnDesc.c, fnName))
  })
    .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * @deprecated
 */
export const extractFunctionStructure = async function (
  { content }: { content: string | BabelNode | null }): Promise<Signature[]> {

  // TODO: try to parse with: esprima, acorn, espree, babylon
  // espree is based on acorn and is used by eslint
  // babylon is based on acorn and is used by babel
  if (!content) return []

  const parsedContent = typeof content === 'string' ? parse(content) : content
  const fnTree = fnOnlyTreeCreator(parsedContent)
  return collapseFnNamesTree(fnTree)
}

/**
 * @deprecated
 */
export type rnSignature = {
  id: number | string,
  structure: Signature[],
}
/**
 * @deprecated
 */
export const parseRNBundle = async function (
  { content }: { content: string }): Promise<rnSignature[]> {

  if (!content) return []

  const parsed = parse(content)
  const declareFns = rnDeclareFns(parsed)

  const lazyDeclareFnPromises = declareFns.map(({ data }) => {
    return async () => {
      if (data === null) {
        return null
      }

      const { id, factory } = data
      return { id, structure: await extractFunctionStructure({ content: factory }) }
    }
  })

  return compact(await resolveAllOrInParallel(lazyDeclareFnPromises))
}

/**
 * @deprecated
 */
export const extractLiteralStructure = async function (
  { content }: { content: string | BabelNode | null }): Promise<SignatureLiteral[]> {

  if (!content) return []

  const parsed = typeof content === 'string' ? parse(content) : content
  return collapseLiteralValsTree(literalValues(parsed))
}

// todo: refactor existing types rather than alias them
export type FunctionSignature = Signature
export type LiteralSignature = SignatureLiteral
export type signatureNew = {
  functionSignature: FunctionSignature[],
  literalSignature: LiteralSignature[],
}
export type rnSignatureNew = signatureNew & {
  id: number | string,
}
const _extractStructure = function (
  { content }: { content: string | BabelNode }): signatureNew {

  const parsed = typeof content === 'string' ? parse(content) : content

  const functionSignature = collapseFnNamesTree(fnOnlyTreeCreator(parsed))
  const literalSignature = collapseLiteralValsTree(literalValues(parsed))

  return { functionSignature, literalSignature }
}

export const extractStructure = async function (
  { content }: { content: string }): Promise<signatureNew> {

  return _extractStructure({ content })
}

export const extractReactNativeStructure = async function (
  { content }: { content: string }): Promise<rnSignatureNew[]> {

  return rnDeclareFns(parse(content))
    .map(({ data }) => {
      const { id, factory } = data
      const structure = _extractStructure({ content: factory })
      return { id, ...structure }
    })
}
