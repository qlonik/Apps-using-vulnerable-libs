import { test } from 'ava'
import { stripIndent, oneLineTrim } from 'common-tags'
import { DECLARATION, EXPRESSION, PARAM } from '../tags'
import { checkTokensMacro } from './_macros'

test(
  'expr, expr',
  checkTokensMacro,
  stripIndent`
    function a() {
      b, c;
    }
  `,
  [`${EXPRESSION}:Sequence[${EXPRESSION}:Identifier[b], ${EXPRESSION}:Identifier[c]]`],
)

test(
  'var = expr, expr++, expr',
  checkTokensMacro,
  `
    function a() {
      let b;
      b = c, d++, e;
    }
  `,
  [
    `${DECLARATION}:Variable[${PARAM}:Identifier[b]]`,
    oneLineTrim`
      ${EXPRESSION}:Sequence[
        ${EXPRESSION}:Assignment[${PARAM}:Identifier[b] = ${EXPRESSION}:Identifier[c]]
      , ${EXPRESSION}:Update[${EXPRESSION}:Identifier[d]++]
      , ${EXPRESSION}:Identifier[e]
      ]
    `,
  ],
)

test(
  'var = (expr, expr++, expr)',
  checkTokensMacro,
  `
    function a() {
      let b;
      b = (c, d++, e);
    }
  `,
  [
    `${DECLARATION}:Variable[${PARAM}:Identifier[b]]`,
    oneLineTrim`
      ${EXPRESSION}:Assignment[
        ${PARAM}:Identifier[b] = ${EXPRESSION}:Sequence[
          ${EXPRESSION}:Identifier[c]
        , ${EXPRESSION}:Update[${EXPRESSION}:Identifier[d]++]
        , ${EXPRESSION}:Identifier[e]
        ]
      ]
    `,
  ],
)
