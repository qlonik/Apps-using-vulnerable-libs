import test from 'ava'
import { stripIndent } from 'common-tags'
import { DECLARATION, EXPRESSION, LITERAL, PARAM } from '../tags'
import { checkTokensMacro } from './_macros'

const operators = ['=', '+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '>>>=', '|=', '^=', '&=']

operators.forEach(op => {
  test(
    `"${op}"`,
    checkTokensMacro,
    stripIndent`
      function a() {
        var a = 1, b = 1;
        b ${op} a;
      }
    `,
    [
      `${DECLARATION}:Variable[${PARAM}:Identifier[a] = ${LITERAL}:Numeric]`,
      `${DECLARATION}:Variable[${PARAM}:Identifier[b] = ${LITERAL}:Numeric]`,
      `${EXPRESSION}:Assignment[${PARAM}:Identifier[b] ${op} ${EXPRESSION}:Identifier[a]]`,
    ],
  )
})
