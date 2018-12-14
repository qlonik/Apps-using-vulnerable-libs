import test from 'ava'
import { stripIndent } from 'common-tags'
import { DECLARATION, EXPRESSION, PARAM } from '../tags'
import { checkTokensMacro } from './_macros'

test(
  'declaration',
  checkTokensMacro,
  stripIndent`
    function a() {
      function b() {};
    }
  `,
  [`${DECLARATION}:Function[${EXPRESSION}:Identifier[b]]`],
)

test(
  "expression: 'function' keyword",
  checkTokensMacro,
  stripIndent`
    function a() {
      var b = function () {};
      (function c() {});
      (function () {});
    }
  `,
  [
    `${DECLARATION}:Variable[${PARAM}:Identifier[b] = ${EXPRESSION}:Function[anonymous]]`,
    `${EXPRESSION}:Function[${EXPRESSION}:Identifier[c]]`,
    `${EXPRESSION}:Function[anonymous]`,
  ],
)

test(
  'expression: arrow function',
  checkTokensMacro,
  stripIndent`
    function a() {
      var b = () => {};
      (() => {});
    }
  `,
  [
    `${DECLARATION}:Variable[${PARAM}:Identifier[b] = ${EXPRESSION}:ArrowFunction]`,
    `${EXPRESSION}:ArrowFunction`,
  ],
)
