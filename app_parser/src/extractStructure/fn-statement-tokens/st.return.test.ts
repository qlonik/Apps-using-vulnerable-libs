import { test } from 'ava'
import { stripIndent } from 'common-tags'
import { DECLARATION, EXPRESSION, LITERAL, PARAM, STATEMENT } from '../tags'
import { checkTokensMacro } from './_macros'

test(
  'empty',
  checkTokensMacro,
  stripIndent`
    function a() {
      return;
    }
  `,
  [`${STATEMENT}:Return`],
)

test(
  'literal',
  checkTokensMacro,
  stripIndent`
    function a() {
      return 1;
    }
  `,
  [`${STATEMENT}:Return[${LITERAL}:Numeric]`],
)

test(
  'variable update',
  checkTokensMacro,
  stripIndent`
    function a() {
      var i = 0;
      return ++i;
    }
  `,
  [
    `${DECLARATION}:Variable[${PARAM}:Identifier[i] = ${LITERAL}:Numeric]`,
    `${STATEMENT}:Return[${EXPRESSION}:Update[++${EXPRESSION}:Identifier[i]]]`,
  ],
)
