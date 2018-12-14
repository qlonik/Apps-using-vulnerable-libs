import test from 'ava'
import { stripIndent } from 'common-tags'
import { DECLARATION, EXPRESSION, LITERAL, PARAM, STATEMENT } from '../tags'
import { checkTokensMacro } from './_macros'

test(
  'basic',
  checkTokensMacro,
  stripIndent`
    function a() {
      for (;;) {}
    }
  `,
  [`${STATEMENT}:For`],
)

test(
  'with statement init',
  checkTokensMacro,
  stripIndent`
    function a() {
      for (var i = 0;;) {}
    }
  `,
  [`${STATEMENT}:For`, `${DECLARATION}:Variable[${PARAM}:Identifier[i] = ${LITERAL}:Numeric]`],
)

test(
  'with expression init',
  checkTokensMacro,
  stripIndent`
    function a() {
      for (i = 0;;) {}
    }
  `,
  [`${STATEMENT}:For`, `${EXPRESSION}:Assignment[${PARAM}:Identifier[i] = ${LITERAL}:Numeric]`],
)

test(
  'with test',
  checkTokensMacro,
  stripIndent`
    function a() {
      for (;i < 10;) {}
    }
  `,
  [`${STATEMENT}:For`, `${EXPRESSION}:Binary[${EXPRESSION}:Identifier[i] < ${LITERAL}:Numeric]`],
)

test(
  'with update',
  checkTokensMacro,
  stripIndent`
    function a() {
      for (;;i++) {}
    }
  `,
  [`${STATEMENT}:For`, `${EXPRESSION}:Update[${EXPRESSION}:Identifier[i]++]`],
)

test(
  'with expression body',
  checkTokensMacro,
  stripIndent`
    function a() {
      for (;;) i++;
    }
  `,
  [`${STATEMENT}:For`, `${EXPRESSION}:Update[${EXPRESSION}:Identifier[i]++]`],
)

test(
  'with statement body',
  checkTokensMacro,
  stripIndent`
    function a() {
      for (;;) {
        i++;
      }
    }
  `,
  [`${STATEMENT}:For`, `${EXPRESSION}:Update[${EXPRESSION}:Identifier[i]++]`],
)

test(
  'full test',
  checkTokensMacro,
  stripIndent`
    function a() {
      for (var i = 0, l = 10; i < l; i++) {
        l--;
      }
    }
  `,
  [
    `${STATEMENT}:For`,
    `${DECLARATION}:Variable[${PARAM}:Identifier[i] = ${LITERAL}:Numeric]`,
    `${DECLARATION}:Variable[${PARAM}:Identifier[l] = ${LITERAL}:Numeric]`,
    `${EXPRESSION}:Binary[${EXPRESSION}:Identifier[i] < ${EXPRESSION}:Identifier[l]]`,
    `${EXPRESSION}:Update[${EXPRESSION}:Identifier[i]++]`,
    `${EXPRESSION}:Update[${EXPRESSION}:Identifier[l]--]`,
  ],
)

test(
  'for-in',
  checkTokensMacro,
  stripIndent`
    function a() {
      for (let b in {}) {
        c = 123
      }
    }
  `,
  [
    `${STATEMENT}:For-In`,
    `${DECLARATION}:Variable[${PARAM}:Identifier[b]]`,
    `${EXPRESSION}:Object`,
    `${EXPRESSION}:Assignment[${PARAM}:Identifier[c] = ${LITERAL}:Numeric]`,
  ],
)

test(
  'for-of',
  checkTokensMacro,
  stripIndent`
    function a() {
      for (let b of {}) {
        c = 123
      }
    }
  `,
  [
    `${STATEMENT}:For-Of`,
    `${DECLARATION}:Variable[${PARAM}:Identifier[b]]`,
    `${EXPRESSION}:Object`,
    `${EXPRESSION}:Assignment[${PARAM}:Identifier[c] = ${LITERAL}:Numeric]`,
  ],
)
