import {
  Identifier,
  isArrowFunctionExpression,
  isAssignmentExpression,
  isAssignmentPattern,
  isBinaryExpression,
  isCallExpression,
  isFunction,
  isFunctionDeclaration,
  isFunctionExpression,
  isIdentifier,
  isLiteral,
  isMemberExpression,
  isNullLiteral,
  isObjectMethod,
  isProperty,
  isRegExpLiteral,
  isReturnStatement,
  isTemplateLiteral,
  isVariableDeclarator,
  Literal,
  Node as BabelNode
} from 'babel-types'
import { parse } from 'babylon'
import { stripIndent } from 'common-tags'
import { flatMap, Many } from 'lodash'
import { inspect as utilInspect } from 'util'
import { stdoutLog } from '../utils/logger'
import { getFnStatementTokens } from './fnStatementTokens'
import { getFnStatementTypes } from './fnStatementTypes'


const CONCAT_FNS_WITH = ':>>:'


/**
 * Extracted Signature for function
 *
 * <i>note:</i> there may be more signature types later on
 *
 * @param type - type of the signature. What this signature is for. This object always describes
 *   signature of a function.
 * @param name - possible name of function. For signature mechanism based on function names.
 * @param fnStatementTypes - statement types in the function. For signature mechanism based on
 *   statement types in the function.
 * @param fnStatementTokens - tokens extracted from function statements. For signature mechanism
 *   based on renaming tokens in statements in the function.
 */
export type Signature = {
  type: 'fn',
  name: string,
  fnStatementTypes?: string[] | null,
  fnStatementTokens?: string[] | null,
}
/**
 * @param prop - property name
 * @param data - custom data
 * @param node - node of the AST
 * @param c - children
 */
type TreePath<T> = {
  prop: string | number,
  data: T | null,
  node?: BabelNode,
  c?: TreePath<T>[],
}


const NAMESPACE = 'x.Struct'
const log = stdoutLog(NAMESPACE)

const pathConcat = (p: string, c: string | number): string => {
  return p.concat(typeof c === 'number' ? `[${c}]` : (p.length ? '.' + c : c))
}

const fnNamesConcat = (p: string, f: string): string => {
  const st = p.length ? CONCAT_FNS_WITH : ''
  return p.concat(st).concat(f)
}

const extractNameFromLiteral = (node: Literal): string => {
  if (isRegExpLiteral(node)) {
    return '*regexp literal*'
  }
  if (isNullLiteral(node)) {
    return '*null literal*'
  }
  if (isTemplateLiteral(node)) {
    return '*template literal*'
  }
  return node.value.toString()
}

const extractNameFromIdentifier = (node: Identifier): string => {
  return `'${node.name}'`
}

const visitNodes = <K>(
  {
    fn = undefined,
    includeNodes = false,
  }: {
    fn?: (path: string, val: BabelNode) => K | null,
    includeNodes?: boolean,
  } = {}) => {

  return function paths(
    obj: object | Array<any>,
    pathSoFar: string = ''): TreePath<K>[] {

    let entries: Array<[string | number, BabelNode]> = []
    if (Array.isArray(obj)) {
      entries = [...obj.entries()]
    }
    else if (typeof obj === 'object') {
      entries = Object.entries(obj)
    }

    return flatMap(entries, ([key, value]: [string | number, BabelNode]) => {
      const childPath = pathConcat(pathSoFar, key)
      const result: TreePath<K> = {
        prop: childPath,
        data: typeof fn === 'function' ? fn(childPath, value) : null,
      }

      if (includeNodes) {
        result.node = value
      }

      if (value && typeof value === 'object') {
        result.c = paths(value, childPath)
      }

      if (result.data !== null) {
        return result
      }
      else if (result.c) {
        return result.c
      }
      else {
        return []
      }
    })
  }
}

const fnNodeFilter = (path: string, node: BabelNode): Signature | null => {

  if (node && (<any>node).__skip) {
    return null
  }

  if (isFunctionDeclaration(node) || isFunctionExpression(node)) {
    return {
      type: 'fn',
      name: (node.id && node.id.name) || '[anonymous]',
      fnStatementTypes: getFnStatementTypes(node),
      fnStatementTokens: getFnStatementTokens(node),
    }
  }
  else if (isVariableDeclarator(node) ||
           isAssignmentExpression(node) ||
           isAssignmentPattern(node) ||
           isProperty(node) ||
           isReturnStatement(node) ||
           isObjectMethod(node)) {

    let varNode: any = null
    let fnNode: any = null

    if (isVariableDeclarator(node)) {
      varNode = node.id
      fnNode = node.init
    }
    else if (isAssignmentExpression(node) || isAssignmentPattern(node)) {
      varNode = node.left
      fnNode = node.right
    }
    else if (isProperty(node)) {
      varNode = node.key
      fnNode = node.value
    }
    else if (isReturnStatement(node)) {
      varNode = null
      fnNode = node.argument
    }
    else if (isObjectMethod(node)) {
      varNode = node.key
      fnNode = node
    }


    let varName = undefined
    if (isIdentifier(varNode)) {
      varName = extractNameFromIdentifier(varNode)
    }
    else if (isLiteral(varNode)) {
      varName = extractNameFromLiteral(varNode)
    }
    else if (isMemberExpression(varNode)) {
      if (isIdentifier(varNode.property)) {
        varName = extractNameFromIdentifier(varNode.property)
      }
      else if (isLiteral(varNode.property)) {
        varName = extractNameFromLiteral(varNode.property)
      }
      else if (isMemberExpression(varNode.property) || isCallExpression(varNode.property)) {
        varName = null
      }
      else if (isBinaryExpression(varNode.property)) {
        const op = varNode.property.operator
        const left = varNode.property.left
        const right = varNode.property.right
        let leftName
        let rightName

        if (isIdentifier(left)) {
          leftName = extractNameFromIdentifier(left)
        }
        else if (isLiteral(left)) {
          leftName = extractNameFromLiteral(left)
        }

        if (isIdentifier(right)) {
          rightName = extractNameFromIdentifier(right)
        }
        else if (isLiteral(right)) {
          rightName = extractNameFromLiteral(right)
        }

        if (leftName && rightName) {
          varName = leftName + op + rightName
        }
      }
    }

    if (varNode && Object.is(varName, undefined) && fnNode && isFunction(fnNode)) {
      console.log(stripIndent`
        This seems like a special case!
        ${path}
        ${utilInspect(node, { depth: Infinity })}
      `)
    }

    let name
    if (isFunctionExpression(fnNode)) {
      name = (fnNode.id && fnNode.id.name) || varName || '[anonymous]'
    }
    else if (isArrowFunctionExpression(fnNode)) {
      name = varName || '[anonymous]'
    }

    if (!isReturnStatement(node) && Object.is(varName, undefined) && name === '[anonymous]') {
      console.log(stripIndent`
        Check this case:
        ${path}
        ${utilInspect(node, { depth: 10 })}
      `)
    }
    if (name) {
      fnNode.__skip = true
      return {
        type: 'fn',
        name,
        fnStatementTypes: getFnStatementTypes(fnNode),
        fnStatementTokens: getFnStatementTokens(fnNode),
      }
    }
  }

  return null
}
const fnOnlyTreeCreator = visitNodes<Signature>({ fn: fnNodeFilter })

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
  { content }: { content: string }): Promise<Signature[]> {

  // TODO: try to parse with: esprima, acorn, espree, babylon
  // espree is based on acorn and is used by eslint
  // babylon is based on acorn and is used by babel
  if (!content) return []

  const parsedContent = parse(content)
  // const inspectedParsed = utilInspect(parsedContent, { depth: Infinity })
  // console.log(inspectedParsed)

  const fnTree = fnOnlyTreeCreator(parsedContent)
  return collapseFnNamesTree(fnTree)
    .sort((a, b) => a.name.localeCompare(b.name))
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
