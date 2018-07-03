import { Node as BabelNode, SourceLocation } from 'babel-types'
import { flatMap, Many } from 'lodash'
import { fnNamesConcat } from './fn-names-concat'
import { EXTRACTOR_VERSION } from './index'
import { fnNodeFilter } from './nodeFilters/allFnsAndNames'
import { literalValuesFilter } from './nodeFilters/literalValues'
import { rnDeclareFnFilter } from './nodeFilters/rnDeclareFn'
import { FunctionSignature } from './types'
import { TreePath, visitNodes } from './visit-nodes'

/* eslint-disable no-unused-vars */
// These empty declaration are here so that IntelliJ does not strip unused imports
// These imports are required for TypeScript, for functions declared below
// Without these imports, TypeScripts throws error
// 'TS4023: Variable is using name from external module but cannot be named'
declare const __x: SourceLocation
declare const __y: BabelNode
declare const __z: EXTRACTOR_VERSION
/* eslint-enable */

export const fnOnlyTreeCreator = visitNodes<FunctionSignature>({ fn: fnNodeFilter })
export const rnDeclareFns = visitNodes({ fn: rnDeclareFnFilter })
export const literalValues = visitNodes({ fn: literalValuesFilter })

export const collapseFnNamesTree = (
  tree: TreePath<FunctionSignature>[],
  fnNameSoFar: string = '',
): FunctionSignature[] => {
  return flatMap(tree, (fnDesc: TreePath<FunctionSignature>): Many<FunctionSignature> => {
    const fnName = fnNamesConcat(fnNameSoFar, fnDesc.data.name)
    const treeElem: FunctionSignature = { ...fnDesc.data, name: fnName }
    return !fnDesc.c ? treeElem : [treeElem].concat(collapseFnNamesTree(fnDesc.c, fnName))
  })
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((el, index) => ({ ...el, index }))
}
