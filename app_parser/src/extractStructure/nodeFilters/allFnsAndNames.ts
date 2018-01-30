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
} from 'babel-types'
import { stripIndent } from 'common-tags'
import { inspect as utilInspect } from 'util'
import { getFnStatementTokens } from '../fnStatementTokens';
import { getFnStatementTypes } from '../fnStatementTypes'
import { Signal, Signals } from '../visitNodes'


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

export const fnNodeFilter = (path: string, node: BabelNode): Signal<Signature> => {

  if (node && (<any>node).__skip) {
    return new Signal<Signature>(Signals.continueRecursion, null)
  }

  if (isFunctionDeclaration(node) || isFunctionExpression(node)) {
    return new Signal<Signature>(Signals.continueRecursion, {
      type: 'fn',
      name: (node.id && node.id.name) || '[anonymous]',
      fnStatementTypes: getFnStatementTypes(node),
      fnStatementTokens: getFnStatementTokens(node),
    })
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
      return new Signal<Signature>(Signals.continueRecursion, {
        type: 'fn',
        name,
        fnStatementTypes: getFnStatementTypes(fnNode),
        fnStatementTokens: getFnStatementTokens(fnNode),
      })
    }
  }

  return new Signal<Signature>(Signals.continueRecursion, null)
}
