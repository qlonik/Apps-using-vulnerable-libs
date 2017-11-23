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
  isProperty,
  isRegExpLiteral,
  isReturnStatement,
  isTemplateLiteral,
  isVariableDeclarator,
  Literal,
  Node as BabNode
} from 'babel-types'
import { parse } from 'babylon'
// import { Node as BabNode } from 'estree'
import { flatMap, Many } from 'lodash'
import { inspect as utilInspect } from 'util'


const CONCAT_FNS_WITH = ':>>:'


export type Signature = string[]

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

/**
 * @param prop - property name
 * @param c - children
 */
type TreePath<T> = {
  prop: string | number,
  data: T | null,
  node?: BabNode,
  c?: TreePath<T>[],
}

interface visitNodesOptsType<T> {
  fn?: (path: string, val: BabNode) => T | null,
  includeNodes?: boolean;
}

const visitNodesOptsDefault: visitNodesOptsType<any> = {
  fn: () => ({}),
  includeNodes: false,
}

const visitNodes = <K>({ fn, includeNodes } = visitNodesOptsDefault) => {
  return function paths(obj: object | Array<any>, pathSoFar: string = ''): TreePath<K>[] {
    let entries: Array<[string | number, any]> = []
    if (Array.isArray(obj)) {
      entries = [...obj.entries()]
    }
    else if (typeof obj === 'object') {
      entries = Object.entries(obj)
    }

    return flatMap(entries, ([key, value]: [string, BabNode]) => {
      const childPath = pathConcat(pathSoFar, key)
      const result: TreePath<K> = {
        prop: childPath,
        data: fn(childPath, value),
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

type myNodeDescriptor = { name: string }
const fnNodeFilter = (path: string, node: BabNode): myNodeDescriptor | null => {

  if (node && (<any>node).__skip) {
    return null
  }

  if (isFunctionDeclaration(node) || isFunctionExpression(node)) {
    return { name: (node.id && node.id.name) || '[anonymous]' }
  }
  else if (isVariableDeclarator(node) ||
           isAssignmentExpression(node) ||
           isAssignmentPattern(node) ||
           isProperty(node) ||
           isReturnStatement(node)) {
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
      console.log([
        'This seems like special case!',
        path,
        utilInspect(node, { depth: Infinity })
      ].join('\n'))
    }

    let name
    if (isFunctionExpression(fnNode)) {
      name = (fnNode.id && fnNode.id.name) || varName || '[anonymous]'
    }
    else if (isArrowFunctionExpression(fnNode)) {
      name = varName || '[anonymous]'
    }

    if (!isReturnStatement(node) && Object.is(varName, undefined) && name === '[anonymous]') {
      console.log(`check this case: ${path}\n${utilInspect(node, { depth: 10 })}`)
    }
    if (name) {
      fnNode.__skip = true
      return { name }
    }
  }

  return null
}
const fnOnlyTreeCreator = visitNodes<myNodeDescriptor>({ fn: fnNodeFilter })

const collapseFnNamesTree = (
  tree: TreePath<myNodeDescriptor>[],
  fnNameSoFar: string = ''): string[] => {

  return flatMap(tree, (fnDesc: TreePath<myNodeDescriptor>): Many<string> => {
    if (!fnDesc) {
      return []
    }

    const fnName = fnNamesConcat(fnNameSoFar, (<myNodeDescriptor>fnDesc.data).name)
    if (fnDesc.c) {
      return [fnName].concat(collapseFnNamesTree(fnDesc.c, fnName))
    }
    else {
      return fnName
    }
  })
}


type extractStructureConf = {
  content: string,
  scriptFolder?: string,
  outputFilename?: string,
}

export const extractStructure = async function (
  { content }: extractStructureConf): Promise<Signature> {
  // TODO: try to parse with: esprima, acorn, espree, babylon
  // espree is based on acorn and is used by eslint
  // babylon is based on acorn and is used by babel
  if (!content) return []

  const parsedContent = parse(content)
  // const inspectedParsed = utilInspect(parsedContent, { depth: Infinity })
  // console.log(inspectedParsed)

  const fnTree = fnOnlyTreeCreator(parsedContent)
  return collapseFnNamesTree(fnTree).sort()
}

export async function demo() {
  // 10 functions in the following snippet
  let source = `
  var fn, fn2
  fn = function() {
    function a(d = () => {}) {
      b()
      // console.log('hi')
      return function hello() {}
    }
    var b = function name() {
      console.log('hello')
      return () => {}
    }
    const c = () => ({})
  }, fn2 = () => {}
  fn(function () {
    // console.log('hi')
  })
  var obj = {
    insideObj() {}
  }
  `;
  const parsed = parse(source)
  // const inspectedParsed = utilInspect(parsed, { depth: null })
  // console.log(inspectedParsed)

  const tree = visitNodes<myNodeDescriptor>({ fn: fnNodeFilter })(parsed)
  const inspectedTree = utilInspect(tree, { depth: null })
  console.log(inspectedTree)

  const collapsedTree = collapseFnNamesTree(tree)
  const inspectedCollapsedTree = utilInspect(collapsedTree, { depth: null })
  console.log(inspectedCollapsedTree)
}
