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
  isLiteral,
  isLogicalExpression,
  isMemberExpression,
  isMetaProperty,
  isNewExpression,
  isNullLiteral,
  isNumericLiteral,
  isObjectExpression,
  isObjectPattern,
  isParenthesizedExpression,
  isRegExpLiteral,
  isRestElement,
  isReturnStatement,
  isSequenceExpression,
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
  Statement
} from 'babel-types'
import { before, flatMap, Many } from 'lodash'
import { assertNever } from '../utils'
import { stdoutLog } from '../utils/logger'
import { DECLARATION, DIRECTIVE, EXPRESSION, LITERAL, PARAM, STATEMENT } from './tags'


const NAMESPACE = 'x.tokens'
const log = stdoutLog(NAMESPACE)
const limitedLog = before(3, log)

// EIR = Expression Internal Representation
type EIR = {
  title: string,
  type: string | null,
  pred: string | null,
}


const getLiteralIR = (lit: Literal | null): EIR => {
  const descr: EIR = { title: LITERAL, type: null, pred: null }

  if (lit === null) {
  }
  else if (isStringLiteral(lit)) {
    descr.type = 'String'
  }
  else if (isNumericLiteral(lit)) {
    descr.type = 'Numeric'
  }
  else if (isBooleanLiteral(lit)) {
    descr.type = 'Boolean'
  }
  else if (isNullLiteral(lit)) {
    descr.type = 'Null'
  }
  else if (isRegExpLiteral(lit)) {
    descr.type = 'RegExp'
  }
  else if (isTemplateLiteral(lit)) {
    descr.type = 'Template'
  }
  else {
    assertNever(lit)
  }

  return descr
}

const getTokensFromLiteral = (lit: Literal | null): Many<string> => {
  if (lit === null) {
    return []
  }

  const { title, type, pred } = getLiteralIR(lit)

  if (!type) {
    return `t_${title}:${lit.type}`
  }
  else {
    return `${title}:${type}${pred ? `[${pred}]` : ''}`
  }
}

const getLValIR = (lVal: LVal | null): EIR => {
  const descr: EIR = { title: PARAM, type: null, pred: null }

  if (lVal === null) {
  }
  else if (isIdentifier(lVal)) {
    descr.type = 'Identifier'
    descr.pred = lVal.name
  }
  else if (isMemberExpression(lVal)) {
    let objName
    if (isExpression(lVal.object)) {
      const { pred } = getEIR(lVal.object)
      objName = pred
    }
    else if (isSuper(lVal.object)) {
      objName = 'super'
    }
    else {
      assertNever(lVal.object)
    }
    const { pred: propName } = getEIR(lVal.property)

    descr.type = 'Member'
    descr.pred = objName + '.' + propName
  }
  else if (isRestElement(lVal)) {
  }
  else if (isAssignmentPattern(lVal)) {
  }
  else if (isArrayPattern(lVal)) {
  }
  else if (isObjectPattern(lVal)) {
  }
  else {
    assertNever(lVal)
  }

  return descr
}

const getTokensFromLVal = (lVal: LVal[] | LVal | null): Many<string> => {
  if (lVal === null) {
    return []
  }

  if (Array.isArray(lVal)) {
    return flatMap(lVal, getTokensFromLVal)
  }

  const { title, type, pred } = getLValIR(lVal)

  if (!type) {
    return `t_${title}:${lVal.type}`
  }
  else {
    return `${title}:${type}${pred ? `[${pred}]` : ''}`
  }
}

const getEIR = (expr: Expression | null): EIR => {
  let descr: EIR = { title: EXPRESSION, type: null, pred: null }

  if (expr === null) {
  }
  else if (isArrayExpression(expr)) {
  }
  else if (isAssignmentExpression(expr)) {
  }
  else if (isBinaryExpression(expr)) {
    descr.type = 'Binary'
    descr.pred = `a ${expr.operator} b`
  }
  else if (isCallExpression(expr)) {
    descr.type = 'Call'
    if (isExpression(expr.callee)) {
      const { type, pred } = getEIR(expr.callee)
      descr.pred = pred || type
    }
    else if (isSuper(expr.callee)) {
      descr.pred = 'super'
    }
    else {
      assertNever(expr.callee)
    }
  }
  else if (isConditionalExpression(expr)) {
  }
  else if (isFunctionExpression(expr)) {
    const { pred } = getEIR(expr.id)
    descr.type = 'Function'
    descr.pred = pred || 'anonymous'
  }
  else if (isIdentifier(expr) ||
           isMemberExpression(expr)) {

    const { type, pred } = getLValIR(expr)
    descr.type = type
    descr.pred = pred
  }
  else if (isStringLiteral(expr) ||
           isNumericLiteral(expr) ||
           isBooleanLiteral(expr) ||
           isNullLiteral(expr) ||
           isRegExpLiteral(expr) ||
           isTemplateLiteral(expr)) {

    const { title, type } = getLiteralIR(expr)
    descr.title = title
    descr.type = type
  }
  else if (isLogicalExpression(expr)) {
  }
  else if (isNewExpression(expr)) {
  }
  else if (isObjectExpression(expr)) {
    descr.type = 'Object'
  }
  else if (isSequenceExpression(expr)) {
  }
  else if (isThisExpression(expr)) {
  }
  else if (isUnaryExpression(expr)) {
  }
  else if (isUpdateExpression(expr)) {
    descr.type = 'Update'
    descr.pred = expr.prefix ? `${expr.operator}a` : `a${expr.operator}`
  }
  else if (isArrowFunctionExpression(expr)) {
  }
  else if (isClassExpression(expr)) {
  }
  else if (isMetaProperty(expr)) {
  }
  else if (isSuper(expr)) {
  }
  else if (isTaggedTemplateExpression(expr)) {
  }
  else if (isYieldExpression(expr)) {
  }
  else if (isTypeCastExpression(expr)) {
  }
  else if (isJSXElement(expr)) {
  }
  else if (isJSXEmptyExpression(expr)) {
  }
  else if (isJSXIdentifier(expr)) {
  }
  else if (isJSXMemberExpression(expr)) {
  }
  else if (isParenthesizedExpression(expr)) {
  }
  else if (isAwaitExpression(expr)) {
  }
  else if (isBindExpression(expr)) {
  }
  else if (isDoExpression(expr)) {
  }
  else {
    assertNever(expr)
  }

  return descr
}

const getTokensFromExpression = (expr: Expression | null): Many<string> => {
  if (!expr) {
    return []
  }

  const { title, type, pred } = getEIR(expr)
  if (!type) {
    return `t_${title}:${expr.type}`
  }
  else {
    return `${title}:${type}${pred ? `[${pred}]` : ''}`
  }
}

const getTokensFromStatement = (st: Statement | null): Many<string> => {

  if (st === null) {
    return []
  }
  else if (isBlockStatement(st)) {
    return getTokensFromBlockStatement(st)
  }
  else if (isBreakStatement(st)) {
    return `${STATEMENT}:Break`
  }
  else if (isContinueStatement(st)) {
    return `${STATEMENT}:Continue`
  }
  else if (isDebuggerStatement(st)) {
    return `${STATEMENT}:Debugger`
  }
  else if (isDoWhileStatement(st)) {
  }
  else if (isEmptyStatement(st)) {
    return []
  }
  else if (isExpressionStatement(st)) {
    return getTokensFromExpression(st.expression)
  }
  else if (isForInStatement(st)) {
  }
  else if (isForStatement(st)) {
    return [`${STATEMENT}:For`]
      .concat(isExpression(st.init)
        ? getTokensFromExpression(st.init)
        : getTokensFromStatement(st.init))
      .concat(getTokensFromExpression(st.test))
      .concat(getTokensFromExpression(st.update))
      .concat(getTokensFromStatement(st.body))
  }
  else if (isFunctionDeclaration(st)) {
    const { pred } = getEIR(st.id)
    return `${DECLARATION}:Function[${pred || 'anonymous'}]`
  }
  else if (isIfStatement(st)) {
    return [`${STATEMENT}:If`]
      .concat(getTokensFromStatement(st.consequent))
      .concat(getTokensFromStatement(st.alternate))
  }
  else if (isLabeledStatement(st)) {
  }
  else if (isReturnStatement(st)) {
  }
  else if (isSwitchStatement(st)) {
  }
  else if (isThrowStatement(st)) {
  }
  else if (isTryStatement(st)) {
  }
  else if (isVariableDeclaration(st)) {
    return st.declarations.map((declaration) => {
      const id = getLValIR(declaration.id).pred
      const init = !isLiteral(declaration.init)
                   && getEIR(declaration.init).type
                   || getTokensFromExpression(declaration.init)
      return `${DECLARATION}:Variable[${id} = ${init}]`
    })
  }
  else if (isWhileStatement(st)) {
  }
  else if (isWithStatement(st)) {
  }
  else if (isClassDeclaration(st)) {
  }
  else if (isExportAllDeclaration(st)) {
  }
  else if (isExportDefaultDeclaration(st)) {
  }
  else if (isExportNamedDeclaration(st)) {
  }
  else if (isForOfStatement(st)) {
  }
  else if (isImportDeclaration(st)) {
  }
  else if (isDeclareClass(st)) {
  }
  else if (isDeclareFunction(st)) {
  }
  else if (isDeclareInterface(st)) {
  }
  else if (isDeclareModule(st)) {
  }
  else if (isDeclareTypeAlias(st)) {
  }
  else if (isDeclareVariable(st)) {
  }
  else if (isInterfaceDeclaration(st)) {
  }
  else if (isTypeAlias(st)) {
  }
  else {
    assertNever(st)
  }

  return `t_${STATEMENT}:${st.type}`
}

const getTokensFromBlockStatement = (blockStatement: BlockStatement): string[] => {
  const { directives = [], body: statements } = blockStatement

  return directives
    .map(d => `${DIRECTIVE}:${d.value.value}`)
    .concat(flatMap(statements, getTokensFromStatement))
}

export const getFnStatementTokens = (node: BabelNode): string[] | null => {
  if (!isFunction(node)) {
    return null
  }

  let result: string[] = []
  const { params, body } = node

  result = result.concat(getTokensFromLVal(params))

  if (isExpression(body)) {
    result = result.concat(getTokensFromExpression(body))
  }
  else if (isBlockStatement(body)) {
    result = result.concat(getTokensFromBlockStatement(body))
  }

  return result.length ? result.sort() : null
}


