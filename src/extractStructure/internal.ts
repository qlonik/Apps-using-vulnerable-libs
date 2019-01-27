import negate from 'lodash/fp/negate'
import R from 'ramda'
import { assertNever } from '../utils'
import { filterFn, indexedMap } from '../utils/functional'
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
  return R.pipe(
    R.chain(({ data, c: children }: TreePath<FunctionSignature>) => {
      const fnName = fnNamesConcat(fnNameSoFar, data.name)
      const treeElem: FunctionSignature = { ...data, name: fnName }
      return R.concat(
        [treeElem],
        children ? collapseFnNamesTree(children, opts, fnName) : ([] as FunctionSignature[]),
      )
    }),
    R.sortWith([(a, b) => a.name.localeCompare(b.name)]),
    indexedMap((el, index) => ({ ...el, index })),
    filterFn(negate(fnHasNoTokens(opts))),
    filterFn(negate(fnOnlyRetAnonFn(opts))),
  )(tree)
}
