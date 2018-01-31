import { Node as BabelNode } from 'babel-types'
import { parse } from 'babylon'
import { stripIndent } from 'common-tags'
import { compact, flatMap, Many } from 'lodash'
import { resolveAllOrInParallel } from '../utils'
import { stdoutLog } from '../utils/logger'
import { getFnStatementTokens } from './fnStatementTokens'
import { getFnStatementTypes } from './fnStatementTypes'
import { fnNodeFilter, Signature } from './nodeFilters/allFnsAndNames'
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
    const fnStatementTypes = fnDesc.data.fnStatementTypes
      ? fnDesc.data.fnStatementTypes
      : fnDesc.node
        ? getFnStatementTypes(fnDesc.node)
        : null
    const fnStatementTokens = fnDesc.data.fnStatementTokens
      ? fnDesc.data.fnStatementTokens
      : fnDesc.node
        ? getFnStatementTokens(fnDesc.node)
        : null

    const treeElem: Signature = { type: 'fn', name: fnName, fnStatementTypes, fnStatementTokens }

    if (!fnDesc.c) {
      return treeElem
    }
    return [treeElem].concat(collapseFnNamesTree(fnDesc.c, fnName))
  })
}

export const extractStructure = async function (
  { content }: { content: string | BabelNode | null }): Promise<Signature[]> {

  // TODO: try to parse with: esprima, acorn, espree, babylon
  // espree is based on acorn and is used by eslint
  // babylon is based on acorn and is used by babel
  if (!content) return []

  const parsedContent = typeof content === 'string' ? parse(content) : content
  const fnTree = fnOnlyTreeCreator(parsedContent)
  return collapseFnNamesTree(fnTree)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export type rnSignature = {
  id: number | string,
  structure: Signature[],
}
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
      return { id, structure: await extractStructure({ content: factory }) }
    }
  })

  return compact(await resolveAllOrInParallel(lazyDeclareFnPromises))
}

export async function demo() {
  // 11 functions in the following snippet
  let source = `
  var fn, fn2
  fn = function () {
    'directive'
    'one more directive'

    for (let i = 0, l = 10; i < l; i++) {
      if (i % 2 === 0) {
        continue
      }
      else if (i % 3 === 0) {
        debugger
        break
      }
      else {
        console.log('bye')
      }
    }

    let i = 3
    do {
      a(i--)
    } while (i > 0)

    function a(d = () => ({})) {
      b()
      // console.log('hi')
      return function hello(param1, param2) {
      }
    }

    var b = function name(par1, par2 = true) {
      console.log('hello')
      return () => {
      }
    }

    const c = () => ({})

    ;(function () {
      return '123'
    })()
  }, fn2 = () => {
  }
  fn(function () {
    'use strict'
    // console.log('hi')
  })
  var obj = {
    insideObj() {
    }
  }
  `

  const parsed = parse(source)
  // log(stripIndent`
  //   Parsed source tree:
  //   %I
  // `, parsed)

  const tree = fnOnlyTreeCreator(parsed)
  // log(stripIndent`
  //   Function only tree:
  //   %I
  // `, tree)

  const collapsedTree = collapseFnNamesTree(tree)
    .sort((a, b) => a.name.localeCompare(b.name))
  log(stripIndent`
    Signature for the file:
    %I
  `, collapsedTree)
}
