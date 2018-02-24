import { isBlockStatement, isExpression, isFunction, Node as BabelNode } from 'babel-types'
import { assertNever } from '../utils'
import { DIRECTIVE, EXPRESSION, PARAM, STATEMENT } from './tags'

export const getFnStatementTypes = (node: BabelNode): string[] | null => {
  if (!isFunction(node)) {
    return null
  }

  let result: string[] = []
  const { params, body } = node
  result = result.concat(params.map((p) => `t_${PARAM}:${p.type}`))

  if (isExpression(body)) {
    result = result.concat(`t_${EXPRESSION}:${body.type}`)
  } else if (isBlockStatement(body)) {
    const { directives = [], body: statements } = body
    result = result
      .concat(directives.map((d) => `t_${DIRECTIVE}:${d.value.value}`))
      .concat(statements.map((st) => `t_${STATEMENT}:${st.type}`))
  } else {
    /* istanbul ignore next */
    assertNever(body)
  }

  return result.sort()
}
