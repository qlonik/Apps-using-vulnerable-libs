import { Node as BabelNode } from 'babel-types'
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
    const { fnStatementTypes, fnStatementTokens } = fnDesc.data
    const treeElem: FunctionSignature = {
      type: 'fn',
      name: fnName,
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
export type signatureNew = {
  functionSignature: FunctionSignature[]
  literalSignature: LiteralSignature[]
}
export type rnSignatureNew = signatureNew & {
  id: number | string
}
const _extractStructure = function({ content }: { content: BabelNode }): signatureNew {
  const functionSignature = collapseFnNamesTree(fnOnlyTreeCreator(content))
  const literalSignature = collapseLiteralValsTree(literalValues(content))

  return { functionSignature, literalSignature }
}

export const extractStructure = async function({
  content,
}: {
  content: string
}): Promise<signatureNew> {
  const { program } = parse(content)
  return _extractStructure({ content: program })
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
