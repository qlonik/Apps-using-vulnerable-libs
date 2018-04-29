/* eslint-disable no-empty, typescript/no-use-before-define */

import {
  BlockStatement,
  Expression,
  isArrayExpression,
  isArrayPattern,
  isArrowFunctionExpression,
  isAssignmentExpression,
  isAssignmentPattern,
  isAwaitExpression,
  isBinaryExpression,
  isBindExpression,
  isBlockStatement,
  isBooleanLiteral,
  isBreakStatement,
  isCallExpression,
  isClassDeclaration,
  isClassExpression,
  isConditionalExpression,
  isContinueStatement,
  isDebuggerStatement,
  isDeclareClass,
  isDeclareFunction,
  isDeclareInterface,
  isDeclareModule,
  isDeclareTypeAlias,
  isDeclareVariable,
  isDoExpression,
  isDoWhileStatement,
  isEmptyStatement,
  isExportAllDeclaration,
  isExportDefaultDeclaration,
  isExportNamedDeclaration,
  isExpression,
  isExpressionStatement,
  isForInStatement,
  isForOfStatement,
  isForStatement,
  isFunction,
  isFunctionDeclaration,
  isFunctionExpression,
  isIdentifier,
  isIfStatement,
  isImportDeclaration,
  isInterfaceDeclaration,
  isJSXElement,
  isJSXEmptyExpression,
  isJSXIdentifier,
  isJSXMemberExpression,
  isLabeledStatement,
  isLogicalExpression,
  isLVal,
  isMemberExpression,
  isMetaProperty,
  isNewExpression,
  isNullLiteral,
  isNumericLiteral,
  isObjectExpression,
  isObjectMethod,
  isObjectPattern,
  isObjectProperty,
  isParenthesizedExpression,
  isRegExpLiteral,
  isRestElement,
  isReturnStatement,
  isSequenceExpression,
  isSpreadElement,
  isSpreadProperty,
  isStringLiteral,
  isSuper,
  isSwitchStatement,
  isTaggedTemplateExpression,
  isTemplateLiteral,
  isThisExpression,
  isThrowStatement,
  isTryStatement,
  isTypeAlias,
  isTypeCastExpression,
  isUnaryExpression,
  isUpdateExpression,
  isVariableDeclaration,
  isWhileStatement,
  isWithStatement,
  isYieldExpression,
  Literal,
  LVal,
  Node as BabelNode,
  Statement,
} from 'babel-types'
import { before, flatMap } from 'lodash'
import { assertNever } from '../utils'
import { stdoutLog } from '../utils/logger'
import { DECLARATION, DIRECTIVE, EXPRESSION, LITERAL, PARAM, STATEMENT, UNKNOWN } from './tags'

const NAMESPACE = 'x.tokens'
const log = stdoutLog(NAMESPACE)
const limitedLog = before(3, log)

// EIR = Expression Internal Representation
type EIR = {
  title: string
  origType: string | null
  type: string | null
  pred: string | null
}

const collapseIR = (eir: EIR | null): string | null => {
  if (eir === null || eir.origType === null) {
    return null
  }

  const { title, origType, type, pred } = eir

  if (!type) {
    return `t_${title}:${origType}`
  } else {
    return `${title}:${type}${pred ? `[${pred}]` : ''}`
  }
}

const getLiteralIR = (lit: Literal | null): EIR => {
  const descr: EIR = {
    title: LITERAL,
    origType: lit ? lit.type : null,
    type: null,
    pred: null,
  }

  /* istanbul ignore if */
  if (lit === null) {
  } else if (isStringLiteral(lit)) {
    descr.type = 'String'
  } else if (isNumericLiteral(lit)) {
    descr.type = 'Numeric'
  } else if (isBooleanLiteral(lit)) {
    descr.type = 'Boolean'
  } else if (isNullLiteral(lit)) {
    descr.type = 'Null'
  } else if (isRegExpLiteral(lit)) {
    descr.type = 'RegExp'
  } else if (isTemplateLiteral(lit)) {
    descr.type = 'Template'
  } else {
    /* istanbul ignore next */
    assertNever(lit)
  }

  return descr
}

const getTokensFromLiteral = (lit: Literal | null): string | null => {
  return collapseIR(getLiteralIR(lit))
}

const getLValIR = (lVal: LVal | null): EIR => {
  const descr: EIR = {
    title: PARAM,
    origType: lVal ? lVal.type : null,
    type: null,
    pred: null,
  }

  /* istanbul ignore if */
  if (lVal === null) {
  } else if (isIdentifier(lVal)) {
    descr.type = 'Identifier'
    descr.pred = lVal.name
  } else if (isMemberExpression(lVal)) {
    let objName = getTokensFromExpression(lVal.object)
    const propName = getTokensFromExpression(lVal.property)
    descr.type = 'Member'
    descr.pred = `${objName} ${lVal.computed ? '>c>' : '>>>'} ${propName}`
  } else if (isRestElement(lVal)) {
  } else if (isAssignmentPattern(lVal)) {
  } else if (isArrayPattern(lVal)) {
  } else if (isObjectPattern(lVal)) {
  } else {
    /* istanbul ignore next */
    assertNever(lVal)
  }

  return descr
}

const getTokensFromLVal = (lVal: LVal | null): string | null => {
  return collapseIR(getLValIR(lVal))
}

const getTokensFromLVals = (lVals: LVal[] | null): string[] => {
  if (lVals === null) {
    return []
  }

  return lVals.map((lVal) => getTokensFromLVal(lVal) || '').filter((v) => !!v)
}

const getEIR = (expr: Expression | null): EIR => {
  let descr: EIR = {
    title: EXPRESSION,
    origType: expr ? expr.type : null,
    type: null,
    pred: null,
  }

  /* istanbul ignore if */
  if (expr === null) {
  } else if (isArrayExpression(expr)) {
  } else if (isAssignmentExpression(expr)) {
    const left = getTokensFromLVal(expr.left)
    const right = getTokensFromExpression(expr.right)
    descr.type = 'Assignment'
    descr.pred = `${left} ${expr.operator} ${right}`
  } else if (isBinaryExpression(expr)) {
    const left = getTokensFromExpression(expr.left)
    const right = getTokensFromExpression(expr.right)
    descr.type = 'Binary'
    descr.pred = `${left} ${expr.operator} ${right}`
  } else if (isCallExpression(expr)) {
    descr.type = 'Call'
    if (isExpression(expr.callee)) {
      const args = expr.arguments
        .map((arg) => {
          if (isSpreadElement(arg)) {
            return `...${getTokensFromExpression(arg.argument)}`
          } else if (isExpression(arg)) {
            return getTokensFromExpression(arg)
          } else {
            /* istanbul ignore next */
            assertNever(arg)
          }
        })
        .join(', ')
      descr.pred = getTokensFromExpression(expr.callee) + `(${args})`
    } else if (isSuper(expr.callee)) {
      descr.pred = 'super'
    } else {
      /* istanbul ignore next */
      assertNever(expr.callee)
    }
  } else if (isConditionalExpression(expr)) {
    const test = getTokensFromExpression(expr.test)
    const cons = getTokensFromExpression(expr.consequent)
    const alt = getTokensFromExpression(expr.alternate)
    descr.type = 'Conditional'
    descr.pred = `${test} ? ${cons} : ${alt}`
  } else if (isFunctionExpression(expr)) {
    descr.type = 'Function'
    descr.pred = getTokensFromExpression(expr.id) || 'anonymous'
  } else if (isIdentifier(expr) || isMemberExpression(expr)) {
    const { type, pred } = getLValIR(expr)
    descr.type = type
    descr.pred = pred
  } else if (
    isStringLiteral(expr) ||
    isNumericLiteral(expr) ||
    isBooleanLiteral(expr) ||
    isNullLiteral(expr) ||
    isRegExpLiteral(expr) ||
    isTemplateLiteral(expr)
  ) {
    const { title, origType, type, pred } = getLiteralIR(expr)
    descr.title = title
    descr.origType = origType
    descr.type = type
    descr.pred = pred
  } else if (isLogicalExpression(expr)) {
  } else if (isNewExpression(expr)) {
  } else if (isObjectExpression(expr)) {
    descr.type = 'Object'
    descr.pred = expr.properties
      .map((p) => {
        if (isObjectProperty(p)) {
          if (p.shorthand && p.computed) {
            log('ObjectExpression>ObjectProperty>shorthand+computed : %o', p)
          }
          const key = getTokensFromExpression(p.key) || ''
          if (p.shorthand) {
            return key
          }
          const value = getTokensFromExpression(p.value) || ''
          return `${key} : ${value}`
        } else if (isObjectMethod(p)) {
          const id = getTokensFromExpression(p.key) || 'anonymous'
          const direction =
            p.kind === 'get'
              ? '< '
              : p.kind === 'set'
                ? '> '
                : p.kind === 'method' ? '' : /* istanbul ignore next */ assertNever(p.kind)
          return `${UNKNOWN}:Method[${direction}${id}]`
        } else if (isSpreadProperty(p)) {
          log('ObjectExpression>SpreadProperty : %o', p)
        } else {
          /* istanbul ignore next */
          assertNever(p)
        }
      })
      .join(', ')
  } else if (isSequenceExpression(expr)) {
  } else if (isThisExpression(expr)) {
    descr.type = 'This'
  } else if (isUnaryExpression(expr)) {
  } else if (isUpdateExpression(expr)) {
    const op = expr.operator
    const arg = getTokensFromExpression(expr.argument)
    descr.type = 'Update'
    descr.pred = expr.prefix ? `${op}${arg}` : `${arg}${op}`
  } else if (isArrowFunctionExpression(expr)) {
    descr.type = 'ArrowFunction'
  } else if (isClassExpression(expr)) {
  } else if (isMetaProperty(expr)) {
  } else if (isSuper(expr)) {
  } else if (isTaggedTemplateExpression(expr)) {
  } else if (isYieldExpression(expr)) {
  } else if (isTypeCastExpression(expr)) {
  } else if (isJSXElement(expr)) {
  } else if (isJSXEmptyExpression(expr)) {
  } else if (isJSXIdentifier(expr)) {
  } else if (isJSXMemberExpression(expr)) {
  } else if (isParenthesizedExpression(expr)) {
  } else if (isAwaitExpression(expr)) {
  } else if (isBindExpression(expr)) {
  } else if (isDoExpression(expr)) {
  } else {
    /* istanbul ignore next */
    assertNever(expr)
  }

  return descr
}

const getTokensFromExpression = (expr: Expression | null): string | null => {
  return collapseIR(getEIR(expr))
}

const getTokensFromStatement = (st: Statement | null): string[] => {
  /* istanbul ignore if */
  if (st === null) {
    return []
  } else if (isBlockStatement(st)) {
    return getTokensFromBlockStatement(st)
  } else if (isBreakStatement(st)) {
    const label = getTokensFromLVal(st.label)
    return [`${STATEMENT}:Break${label ? `[${label}]` : ''}`]
  } else if (isContinueStatement(st)) {
    const label = getTokensFromLVal(st.label)
    return [`${STATEMENT}:Continue${label ? `[${label}]` : ''}`]
  } else if (isDebuggerStatement(st)) {
    return [`${STATEMENT}:Debugger`]
  } else if (isDoWhileStatement(st)) {
    const test = getTokensFromExpression(st.test)
    return [`${STATEMENT}:Do-While${test ? `[${test}]` : ''}`].concat(
      getTokensFromStatement(st.body),
    )
  } else if (isEmptyStatement(st)) {
    return []
  } else if (isExpressionStatement(st)) {
    const tokens = getTokensFromExpression(st.expression)
    return tokens === null ? [] : [tokens]
  } else if (isForInStatement(st)) {
    return [`${STATEMENT}:For-In`]
      .concat(
        isVariableDeclaration(st.left)
          ? getTokensFromStatement(st.left)
          : isLVal(st.left)
            ? getTokensFromLVal(st.left) || []
            : /* istanbul ignore next */ assertNever(st.left),
      )
      .concat(getTokensFromExpression(st.right) || [])
      .concat(getTokensFromStatement(st.body))
  } else if (isForStatement(st)) {
    return [`${STATEMENT}:For`]
      .concat(
        isExpression(st.init)
          ? getTokensFromExpression(st.init) || []
          : getTokensFromStatement(st.init),
      )
      .concat(getTokensFromExpression(st.test) || [])
      .concat(getTokensFromExpression(st.update) || [])
      .concat(getTokensFromStatement(st.body))
  } else if (isFunctionDeclaration(st)) {
    const id = getTokensFromExpression(st.id) || 'anonymous'
    return [`${DECLARATION}:Function[${id}]`]
  } else if (isIfStatement(st)) {
    /*
     * Two cases:
     *    1. if statement with else-if block
     *    2. if statement with else block
     *
     * We always push '${STATEMENT}:If' for the current if, and also data in consequent block.
     * Then, we parse alternate block (if it exists), and if alternate block was another if
     * statement, then we will replace the first value of parsed array (which will correspond to
     * '${STATEMENT}:If' of if in alternate block) with '${STATEMENT}:Else-If'.
     */
    const ifStTitle = `${STATEMENT}:If`
    const testPred = getTokensFromExpression(st.test) || ''
    const ifStatement = `${ifStTitle}[${testPred}]`
    const data = [ifStatement].concat(getTokensFromStatement(st.consequent))

    let mapped = [] as string[]
    if (st.alternate) {
      const alt = getTokensFromStatement(st.alternate)
      if (isIfStatement(st.alternate)) {
        const [first, ...rest] = alt
        mapped = [`${STATEMENT}:Else-If` + first.slice(ifStTitle.length)].concat(rest)
      } else {
        mapped = [`${STATEMENT}:Else`].concat(alt)
      }
    }

    return data.concat(mapped)
  } else if (isLabeledStatement(st)) {
    const label = getTokensFromLVal(st.label)
    return [`${STATEMENT}:Label${label ? `[${label}]` : ''}`].concat(
      getTokensFromStatement(st.body),
    )
  } else if (isReturnStatement(st)) {
    const returned = getTokensFromExpression(st.argument)
    return [`${STATEMENT}:Return${returned ? `[${returned}]` : ''}`]
  } else if (isSwitchStatement(st)) {
  } else if (isThrowStatement(st)) {
  } else if (isTryStatement(st)) {
  } else if (isVariableDeclaration(st)) {
    return st.declarations.map((declaration) => {
      const id = getTokensFromLVal(declaration.id)
      const init = getTokensFromExpression(declaration.init)
      return `${DECLARATION}:Variable[${id}${init ? ` = ${init}` : ''}]`
    })
  } else if (isWhileStatement(st)) {
  } else if (isWithStatement(st)) {
  } else if (isClassDeclaration(st)) {
  } else if (isExportAllDeclaration(st)) {
  } else if (isExportDefaultDeclaration(st)) {
  } else if (isExportNamedDeclaration(st)) {
  } else if (isForOfStatement(st)) {
  } else if (isImportDeclaration(st)) {
  } else if (isDeclareClass(st)) {
  } else if (isDeclareFunction(st)) {
  } else if (isDeclareInterface(st)) {
  } else if (isDeclareModule(st)) {
  } else if (isDeclareTypeAlias(st)) {
  } else if (isDeclareVariable(st)) {
  } else if (isInterfaceDeclaration(st)) {
  } else if (isTypeAlias(st)) {
  } else {
    /* istanbul ignore next */
    assertNever(st)
  }

  return [`t_${STATEMENT}:${st.type}`]
}

const getTokensFromBlockStatement = (blockStatement: BlockStatement): string[] => {
  const { directives = [], body: statements } = blockStatement

  return directives
    .map((d) => `${DIRECTIVE}:${d.value.value}`)
    .concat(flatMap(statements, getTokensFromStatement))
}

export const getFnStatementTokens = (node: BabelNode): string[] | null => {
  if (!isFunction(node)) {
    return null
  }

  let result: string[] = []
  const { params, body } = node

  result = result.concat(getTokensFromLVals(params))

  if (isExpression(body)) {
    result = result.concat(getTokensFromExpression(body) || [])
  } else if (isBlockStatement(body)) {
    result = result.concat(getTokensFromBlockStatement(body))
  } else {
    /* istanbul ignore next */
    assertNever(body)
  }

  return result.sort()
}
