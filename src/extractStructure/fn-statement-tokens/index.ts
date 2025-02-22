/* eslint-disable no-empty, @typescript-eslint/no-use-before-define */

import {
  BlockStatement,
  Expression,
  Function,
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
  Statement,
} from 'babel-types'
import R from 'ramda'
import { assertNever } from '../../utils'
import { filterNullable } from '../../utils/functional'
import logger from '../../utils/logger'
import { EXTRACTOR_VERSION, getDefaultOpts, opts } from '../options'
import { DECLARATION, DIRECTIVE, EXPRESSION, LITERAL, PARAM, STATEMENT, UNKNOWN } from '../tags'

const NAMESPACE = 'x.tokens'
const log = logger.child({ name: NAMESPACE })

// EIR = Expression Internal Representation
type EIR = {
  title: string
  origType: string | null
  type: string | null
  pred: string | null
}

const box = (smth: string | null, before = '[', after = ']'): string => {
  return smth ? `${before}${smth}${after}` : ''
}

type IntoEIR<T> = (x: T | null) => EIR
type IntoStr<T> = (x: T | null) => string | null

const wrapIRProducer: <T>(fn: IntoEIR<T>) => IntoStr<T> = (fn) => (node) => {
  const eir = fn(node)

  if (eir === null || eir.origType === null) {
    return null
  }

  const { title, origType, type, pred } = eir

  if (!type) {
    return `t_${title}:${origType}`
  } else {
    return `${title}:${type}${box(pred)}`
  }
}

const fnStTokensParserWithOptions = ({ 'extractor-version': V }: opts) => {
  const getTokensFromLVal = wrapIRProducer(getLValIR)
  const getTokensFromLVals = R.pipe(
    (x: LVal[] | null) => x || ([] as LVal[]),
    R.map(wrapIRProducer(getLValIR)),
    filterNullable,
  )
  const getTokensFromExpression = wrapIRProducer(getEIR)

  function getLiteralIR(lit: Literal | null): EIR {
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
      // descr.pred = lit.value
    } else if (isNumericLiteral(lit)) {
      descr.type = 'Numeric'
      // descr.pred = `${lit.value}`
    } else if (isBooleanLiteral(lit)) {
      descr.type = 'Boolean'
      // descr.pred = `${lit.value}`
    } else if (isNullLiteral(lit)) {
      descr.type = 'Null'
    } else if (isRegExpLiteral(lit)) {
      descr.type = 'RegExp'
      // descr.pred = `/${lit.pattern}/${lit.flags}`
    } else if (isTemplateLiteral(lit)) {
      descr.type = 'Template'
      // descr.pred = lit.quasis.map((quasi) => quasi.value.cooked).join('...')
    } else {
      /* istanbul ignore next */
      assertNever(lit)
    }

    return descr
  }

  /**
   * Function returning parsed information from the given LVal
   *
   * According to the page ([orig], [archive]), Lval is:
   *
   * > ... an operand of type lval. lvalue is a historical term that
   * > means “an expression that can legally appear on the left side of
   * > an assignment expression.” In JavaScript, variables, properties of
   * > objects, and elements of arrays are lvalues. The ECMAScript
   * > specification allows built-in functions to return lvalues but
   * > does not define any functions that behave that way.
   *
   * [orig]: https://www.safaribooksonline.com/library/view/javascript-the-definitive/9781449393854/ch04s07.html
   * [archive]: https://web.archive.org/web/20180429042209/https://www.safaribooksonline.com/library/view/javascript-the-definitive/9781449393854/ch04s07.html
   *
   * @param lVal - LVal object
   * @returns internal representation of LVal
   */
  function getLValIR(lVal: LVal | null): EIR {
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

    if (lVal && descr.type === null) {
      log.warn({ lVal: descr.origType, loc: lVal.loc }, 'unparsed LVal')
    }
    return descr
  }

  function getEIR(expr: Expression | null): EIR {
    let descr: EIR = {
      title: EXPRESSION,
      origType: expr ? expr.type : null,
      type: null,
      pred: null,
    }

    /* istanbul ignore if */
    if (expr === null) {
    } else if (isArrayExpression(expr)) {
      descr.type = 'Array'
      descr.pred = expr.elements
        .map((el) => {
          if (isExpression(el)) {
            return getTokensFromExpression(el)
          } else if (isSpreadElement(el)) {
            return `...${getTokensFromExpression(el.argument)}`
          } else if (el === null) {
            return ''
          } else {
            /* istanbul ignore next */
            assertNever(el)
          }
        })
        .join(', ')
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
    } else if (isCallExpression(expr) || isNewExpression(expr)) {
      descr.type = isCallExpression(expr)
        ? 'Call'
        : isNewExpression(expr)
        ? 'New'
        : /* istanbul ignore next */ assertNever(expr)

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
        log.warn({ expr }, 'CallExpression||NewExpression>callee.isSuper')
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
      const left = getTokensFromExpression(expr.left)
      const right = getTokensFromExpression(expr.right)
      descr.type = 'Logical'
      descr.pred = `${left} ${expr.operator} ${right}`
    } else if (isObjectExpression(expr)) {
      descr.type = 'Object'
      descr.pred = expr.properties
        .map((p) => {
          if (isObjectProperty(p)) {
            if (p.shorthand && p.computed) {
              log.warn({ expr }, 'ObjectExpression>ObjectProperty>shorthand+computed')
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
                : p.kind === 'method'
                ? ''
                : /* istanbul ignore next */ assertNever(p.kind)
            return `${UNKNOWN}:Method[${direction}${id}]`
          } else if (isSpreadProperty(p)) {
            log.warn({ expr }, 'ObjectExpression>SpreadProperty')
          } else {
            /* istanbul ignore next */
            assertNever(p)
          }
        })
        .join(', ')
    } else if (isSequenceExpression(expr)) {
      descr.type = 'Sequence'
      descr.pred = expr.expressions.map(getTokensFromExpression).join(', ')
    } else if (isThisExpression(expr)) {
      descr.type = 'This'
    } else if (isUnaryExpression(expr)) {
      const op = expr.operator
      const arg = getTokensFromExpression(expr.argument)
      descr.type = 'Unary'
      descr.pred = expr.prefix ? `${op} ${arg}` : `${arg} ${op}`

      if (expr.prefix === false) {
        log.warn({ expr }, 'UnaryExpression>prefix===false')
      }
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

    if (expr && descr.type === null) {
      log.warn({ expr: descr.origType, loc: expr.loc }, 'unparsed expression')
    }
    return descr
  }

  function getTokensFromStatement(st: Statement | null): string[] {
    /* istanbul ignore if */
    if (st === null) {
      return []
    } else if (isBlockStatement(st)) {
      return getTokensFromBlockStatement(st)
    } else if (isBreakStatement(st)) {
      const label = getTokensFromLVal(st.label)
      return [`${STATEMENT}:Break${box(label)}`]
    } else if (isContinueStatement(st)) {
      const label = getTokensFromLVal(st.label)
      return [`${STATEMENT}:Continue${box(label)}`]
    } else if (isDebuggerStatement(st)) {
      return [`${STATEMENT}:Debugger`]
    } else if (isDoWhileStatement(st)) {
      const test = getTokensFromExpression(st.test)
      return [`${STATEMENT}:Do-While${box(test)}`].concat(getTokensFromStatement(st.body))
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
      const testPred = getTokensFromExpression(st.test)
      const ifStatement = `${ifStTitle}${box(testPred)}`
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
      return [`${STATEMENT}:Label${box(label)}`].concat(getTokensFromStatement(st.body))
    } else if (isReturnStatement(st)) {
      const returned = getTokensFromExpression(st.argument)
      return [`${STATEMENT}:Return${box(returned)}`]
    } else if (isSwitchStatement(st)) {
      const discriminant = getTokensFromExpression(st.discriminant)
      const { tests, statements } = st.cases.reduce(
        ({ tests, statements }, c) => {
          const test = c.test === null ? 'default' : getTokensFromExpression(c.test)
          return {
            tests: tests.concat(test),
            statements: statements.concat(R.chain(getTokensFromStatement, c.consequent)),
          }
        },
        { tests: [] as (string | null)[], statements: [] as string[] },
      )
      const pred =
        box(discriminant, 's ', ';') +
        box(
          tests
            .filter((t) => !!t)
            .map((t) => box(t, 'c ', ''))
            .join(', '),
          ' ',
          '',
        )
      return [`${STATEMENT}:Switch${box(pred)}`].concat(statements)
    } else if (isThrowStatement(st)) {
      const throwArg = getTokensFromExpression(st.argument)
      return [`${STATEMENT}:Throw${box(throwArg)}`]
    } else if (isTryStatement(st)) {
      let catchBlock = ''
      let pred = null
      if (st.handler) {
        catchBlock = '-Catch'
        pred = getTokensFromLVal(st.handler.param)
      }
      const finallyBlock = st.finalizer ? '-Finally' : ''

      return [`${STATEMENT}:Try${catchBlock}${finallyBlock}${box(pred)}`]
        .concat(getTokensFromBlockStatement(st.block))
        .concat(st.handler ? getTokensFromBlockStatement(st.handler.body) : [])
        .concat(st.finalizer ? getTokensFromBlockStatement(st.finalizer) : [])
    } else if (isVariableDeclaration(st)) {
      return st.declarations
        .map((declaration) => {
          const id = getTokensFromLVal(declaration.id)
          const init = getTokensFromExpression(declaration.init)
          if (V === EXTRACTOR_VERSION.v1 || V === EXTRACTOR_VERSION.v3) {
          } else if (V === EXTRACTOR_VERSION.v2) {
            if (!init) {
              return null
            }
          } else {
            /* istanbul ignore next */
            assertNever(V)
          }
          const pred = box(`${id}${box(init, ' = ', '')}`)
          return `${DECLARATION}:Variable${pred}`
        })
        .filter((de): de is string => typeof de === 'string')
    } else if (isWhileStatement(st)) {
      const test = getTokensFromExpression(st.test)
      return [`${STATEMENT}:While${box(test)}`].concat(getTokensFromStatement(st.body))
    } else if (isWithStatement(st)) {
      const object = getTokensFromExpression(st.object)
      return [`${STATEMENT}:With${box(object)}`].concat(getTokensFromStatement(st.body))
    } else if (isClassDeclaration(st)) {
    } else if (isExportAllDeclaration(st)) {
    } else if (isExportDefaultDeclaration(st)) {
    } else if (isExportNamedDeclaration(st)) {
    } else if (isForOfStatement(st)) {
      return [`${STATEMENT}:For-Of`]
        .concat(
          isVariableDeclaration(st.left)
            ? getTokensFromStatement(st.left)
            : isLVal(st.left)
            ? getTokensFromLVal(st.left) || []
            : /* istanbul ignore next */ assertNever(st.left),
        )
        .concat(getTokensFromExpression(st.right) || [])
        .concat(getTokensFromStatement(st.body))
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

    log.warn({ st: st.type, loc: st.loc }, 'unparsed statement')
    return [`t_${STATEMENT}:${st.type}`]
  }

  function getTokensFromBlockStatement(blockStatement: BlockStatement): string[] {
    const { directives = [], body: statements } = blockStatement

    return directives
      .map((d) => `${DIRECTIVE}:${d.value.value}`)
      .concat(R.chain(getTokensFromStatement, statements))
  }

  return (node: Function): string[] => {
    let result: string[] = []
    const { params, body } = node

    if (V === EXTRACTOR_VERSION.v1) {
      result = result.concat(getTokensFromLVals(params))
    } else if (V === EXTRACTOR_VERSION.v2 || V === EXTRACTOR_VERSION.v3) {
    } else {
      /* istanbul ignore next */
      assertNever(V)
    }

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
}

export function getFnStatementTokens(opts?: opts): (node: Function) => string[] {
  return fnStTokensParserWithOptions(getDefaultOpts(opts))
}
