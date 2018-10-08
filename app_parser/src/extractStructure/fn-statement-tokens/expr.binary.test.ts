import test from 'ava'
import { oneLineTrim, stripIndent } from 'common-tags'
import { EXPRESSION, LITERAL } from '../tags'
import { checkTokensMacro } from './_macros'

const operators = [
  '+',
  '-',
  '/',
  '%',
  '*',
  '**',
  '&',
  '|',
  '>>',
  '>>>',
  '<<',
  '^',
  '==',
  '===',
  '!=',
  '!==',
  'in',
  'instanceof',
  '>',
  '<',
  '>=',
  '<=',
]

operators.forEach(op => {
  test(
    `"${op}"`,
    checkTokensMacro,
    stripIndent`
      function a() {
        1 ${op} 2;
      }
    `,
    [`${EXPRESSION}:Binary[${LITERAL}:Numeric ${op} ${LITERAL}:Numeric]`],
  )
})

test(
  'three elements',
  checkTokensMacro,
  stripIndent`
    function a() {
      1 + 2 + 3;
    }
  `,
  [
    oneLineTrim`${EXPRESSION}:Binary[
      ${EXPRESSION}:Binary[
        ${LITERAL}:Numeric + ${LITERAL}:Numeric
      ] + ${LITERAL}:Numeric
    ]`,
  ],
)
