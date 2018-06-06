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
  Node as BabelNode,
  SourceLocation,
} from 'babel-types'
import { stripIndent } from 'common-tags'
import { inspect as utilInspect } from 'util'
import { stdoutLog } from '../../utils/logger'
import { EXTRACTOR_VERSION, getFnStatementTokens } from '../fn-statement-tokens'
import { getFnStatementTypes } from '../fnStatementTypes'
import { Signal } from '../visit-nodes'
import { opts } from '../index'

const log = stdoutLog('extractStructure:nodeFilters:allFnsAndNames')

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
  index: number
  type: 'fn'
  name: string
  loc: SourceLocation
  fnStatementTypes: string[]
  fnStatementTokens: string[]
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
  return `${node.name}`
}

/**
 * DeepCopy like function. This is needed, because SourceLocation is actually
 * an instance of a class, and start and end are also instances of a different
 * class. So this function transforms incoming SourceLocation into plain
 * SourceLocation object.
 *
 * @param {SourceLocation} loc - instance of {@link SourceLocation} class
 * @returns plain object representing {@link SourceLocation}
 */
const extractNodeLocation = (loc: SourceLocation): SourceLocation => {
  return {
    start: { line: loc.start.line, column: loc.start.column },
    end: { line: loc.end.line, column: loc.end.column },
  }
}

export const fnNodeFilter = (
  path: string,
  node: BabelNode,
  { 'extractor-version': extrVersion = EXTRACTOR_VERSION.v1 }: opts = {},
): Signal<Signature> => {
  if (node && (<any>node).__skip) {
    return Signal.continue<Signature>(null)
  }

  if (isFunctionDeclaration(node) || isFunctionExpression(node)) {
    return Signal.continue<Signature>({
      index: -1,
      type: 'fn',
      name: (node.id && node.id.name) || '[anonymous]',
      loc: extractNodeLocation(node.loc),
      fnStatementTypes: getFnStatementTypes(node),
      fnStatementTokens: getFnStatementTokens({ v: extrVersion })(node),
    })
  } else if (
    isVariableDeclarator(node) ||
    isAssignmentExpression(node) ||
    isAssignmentPattern(node) ||
    isProperty(node) ||
    isReturnStatement(node) ||
    isObjectMethod(node)
  ) {
    let varNode: any = null
    let fnNode: any = null

    if (isVariableDeclarator(node)) {
      varNode = node.id
      fnNode = node.init
    } else if (isAssignmentExpression(node) || isAssignmentPattern(node)) {
      varNode = node.left
      fnNode = node.right
    } else if (isProperty(node)) {
      varNode = node.key
      fnNode = node.value
    } else if (isReturnStatement(node)) {
      varNode = null
      fnNode = node.argument
    } else if (isObjectMethod(node)) {
      varNode = node.key
      fnNode = node
    }

    let varName = undefined
    if (isIdentifier(varNode)) {
      varName = extractNameFromIdentifier(varNode)
    } else if (isLiteral(varNode)) {
      varName = extractNameFromLiteral(varNode)
    } else if (isMemberExpression(varNode)) {
      if (isIdentifier(varNode.property)) {
        varName = extractNameFromIdentifier(varNode.property)
      } else if (isLiteral(varNode.property)) {
        varName = extractNameFromLiteral(varNode.property)
      } else if (isMemberExpression(varNode.property) || isCallExpression(varNode.property)) {
        varName = null
      } else if (isBinaryExpression(varNode.property)) {
        const op = varNode.property.operator
        const left = varNode.property.left
        const right = varNode.property.right
        let leftName
        let rightName

        if (isIdentifier(left)) {
          leftName = extractNameFromIdentifier(left)
        } else if (isLiteral(left)) {
          leftName = extractNameFromLiteral(left)
        }

        if (isIdentifier(right)) {
          rightName = extractNameFromIdentifier(right)
        } else if (isLiteral(right)) {
          rightName = extractNameFromLiteral(right)
        }

        if (leftName && rightName) {
          varName = leftName + op + rightName
        }
      }
    }

    if (varNode && Object.is(varName, undefined) && fnNode && isFunction(fnNode)) {
      log(stripIndent`
        This seems like a special case!
        ${path}
        ${utilInspect(node, { depth: Infinity })}
      `)
    }

    let name
    if (isFunctionExpression(fnNode)) {
      name = (fnNode.id && fnNode.id.name) || varName || '[anonymous]'
    } else if (isArrowFunctionExpression(fnNode)) {
      name = varName || '[anonymous]'
    }

    if (!isReturnStatement(node) && Object.is(varName, undefined) && name === '[anonymous]') {
      log(stripIndent`
        Check this case:
        ${path}
        ${utilInspect(node, { depth: 10 })}
      `)
    }
    if (name) {
      fnNode.__skip = true
      return Signal.continue<Signature>({
        index: -1,
        type: 'fn',
        name,
        loc: extractNodeLocation(fnNode.loc),
        fnStatementTypes: getFnStatementTypes(fnNode),
        fnStatementTokens: getFnStatementTokens({ v: extrVersion })(fnNode),
      })
    }
  }

  return Signal.continue<Signature>(null)
}
