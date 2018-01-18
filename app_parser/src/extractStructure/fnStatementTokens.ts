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
  origType: string | null,
  type: string | null,
  pred: string | null,
}

const collapseIR = (eir: EIR | null): string | null => {
  if (eir === null || eir.origType === null) {
    return null
  }

  const { title, origType, type, pred } = eir

  if (!type) {
    return `t_${title}:${origType}`
  }
  else {
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

const getTokensFromLVal = (lVal: LVal | null): string | null => {
  return collapseIR(getLValIR(lVal))
}

const getTokensFromLVals = (lVals: LVal[] | null): string[] => {
  if (lVals === null) {
    return []
  }

  return lVals
    .map(lVal => (getTokensFromLVal(lVal) || ''))
    .filter(v => !!v)
}

const getEIR = (expr: Expression | null): EIR => {
  let descr: EIR = {
    title: EXPRESSION,
    origType: expr ? expr.type : null,
    type: null,
    pred: null,
  }

  if (expr === null) {
  }
  else if (isArrayExpression(expr)) {
  }
  else if (isAssignmentExpression(expr)) {
  }
  else if (isBinaryExpression(expr)) {
    const left = getTokensFromExpression(expr.left)
    const right = getTokensFromExpression(expr.right)
    descr.type = 'Binary'
    descr.pred = `${left} ${expr.operator} ${right}`
  }
  else if (isCallExpression(expr)) {
    descr.type = 'Call'
    if (isExpression(expr.callee)) {
      descr.pred = getTokensFromExpression(expr.callee)
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
    descr.type = 'Function'
    descr.pred = getTokensFromExpression(expr.id) || 'anonymous'
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
    const op = expr.operator
    const arg = getTokensFromExpression(expr.argument)
    descr.type = 'Update'
    descr.pred = expr.prefix ? `${op}${arg}` : `${arg}${op}`
  }
  else if (isArrowFunctionExpression(expr)) {
    descr.type = 'ArrowFunction'
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

const getTokensFromExpression = (expr: Expression | null): string | null => {
  return collapseIR(getEIR(expr))
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
    return getTokensFromExpression(st.expression) || []
  }
  else if (isForInStatement(st)) {
  }
  else if (isForStatement(st)) {
    return [`${STATEMENT}:For`]
      .concat(isExpression(st.init)
        ? (getTokensFromExpression(st.init) || [])
        : getTokensFromStatement(st.init))
      .concat(getTokensFromExpression(st.test) || [])
      .concat(getTokensFromExpression(st.update) || [])
      .concat(getTokensFromStatement(st.body))
  }
  else if (isFunctionDeclaration(st)) {
    const id = getTokensFromExpression(st.id) || 'anonymous'
    return `${DECLARATION}:Function[${id}]`
  }
  else if (isIfStatement(st)) {
    /*
     * Two cases:
     *    1. if statement with else-if block
     *    2. if statement with else block
     *
     * In the first case, the alternate for current if statement is another if statement, so we
     * will push '${STATEMENT}:Else-If' into array of tokens to represent next if statement, and
     * the '${STATEMENT}:If' to represent the first if statement in the chain of if statements
     * will eventually be added from the last else-if in the chain.
     *
     * In the second case, the alternate for current if statement is not another if statement, so
     * we will push '${STATEMENT}:If' into array of tokens to represent current if statement.
     */
    return [`${STATEMENT}:${isIfStatement(st.alternate) ? 'Else-' : ''}If`]
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
      const init = getTokensFromExpression(declaration.init)
      return `${DECLARATION}:Variable[${id}${init ? ` = ${init}` : ''}]`
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

  result = result.concat(getTokensFromLVals(params))

  if (isExpression(body)) {
    result = result.concat(getTokensFromExpression(body) || [])
  }
  else if (isBlockStatement(body)) {
    result = result.concat(getTokensFromBlockStatement(body))
  }
  else {
    assertNever(body)
  }

  return result.sort()
}


