import { flatMap, Many } from 'lodash'
import { negate } from 'lodash/fp'
import { assertNever } from '../utils'
import { fnNamesConcat } from './fn-names-concat'
import { fnNodeFilter } from './node-filters/all-fns-and-names'
import { literalValuesFilter } from './node-filters/literal-values'
import { rnDeclareFnFilter } from './node-filters/rn-declare-fn'
import { EXTRACTOR_VERSION, opts } from './options'
import { EXPRESSION, STATEMENT } from './tags'
import { FunctionSignature } from './types'
import { TreePath, visitNodes } from './visit-nodes'

export const fnOnlyTreeCreator = visitNodes<FunctionSignature>({ fn: fnNodeFilter })
export const rnDeclareFns = visitNodes({ fn: rnDeclareFnFilter })
export const literalValues = visitNodes({ fn: literalValuesFilter })

const fnHasNoTokens = ({ 'extractor-version': V }: opts) => (el: FunctionSignature): boolean => {
  if (V === EXTRACTOR_VERSION.v1 || V === EXTRACTOR_VERSION.v2) {
    return false
  } else if (V === EXTRACTOR_VERSION.v3) {
    return el.fnStatementTokens.length === 0
  } else {
    return assertNever(V)
  }
}
const fnOnlyRetAnonFn = ({ 'extractor-version': V }: opts) => (el: FunctionSignature): boolean => {
  if (V === EXTRACTOR_VERSION.v1 || V === EXTRACTOR_VERSION.v2) {
    return false
  } else if (V === EXTRACTOR_VERSION.v3) {
    return (
      el.fnStatementTokens.length === 1 &&
      el.fnStatementTokens[0] === `${STATEMENT}:Return[${EXPRESSION}:Function[anonymous]]`
    )
  } else {
    return assertNever(V)
  }
}

export const collapseFnNamesTree = (
  tree: TreePath<FunctionSignature>[],
  opts: opts,
  fnNameSoFar: string = '',
): FunctionSignature[] => {
  return flatMap(
    tree,
    (fnDesc: TreePath<FunctionSignature>): Many<FunctionSignature> => {
      const fnName = fnNamesConcat(fnNameSoFar, fnDesc.data.name)
      const treeElem: FunctionSignature = { ...fnDesc.data, name: fnName }
      return !fnDesc.c ? treeElem : [treeElem].concat(collapseFnNamesTree(fnDesc.c, opts, fnName))
    },
  )
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((el, index) => ({ ...el, index }))
    .filter(negate(fnHasNoTokens(opts)))
    .filter(negate(fnOnlyRetAnonFn(opts)))
}
