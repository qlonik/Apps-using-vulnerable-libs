import test from 'ava'
import { stripIndent } from 'common-tags'
import { checkThrows, checkTokensMacro } from './_macros'
import { EXPRESSION, STATEMENT } from '../tags'

test(
  'while () {}',
  checkThrows,
  stripIndent`
    function a() {
      while () {}
    }
  `,
)

test(
  'while {}',
  checkThrows,
  stripIndent`
    function a() {
      while {}
    }
  `,
)

test(
  'while st;',
  checkThrows,
  stripIndent`
    function a() {
      while b++
    }
  `,
)

test(
  'while (expr) {}',
  checkTokensMacro,
  stripIndent`
    function a() {
      while (b) {}
    }
  `,
  [`${STATEMENT}:While[${EXPRESSION}:Identifier[b]]`],
)

test(
  'while (expr) st;',
  checkTokensMacro,
  stripIndent`
    function a() {
      while (b) b++;
    }
  `,
  [
    `${STATEMENT}:While[${EXPRESSION}:Identifier[b]]`,
    `${EXPRESSION}:Update[${EXPRESSION}:Identifier[b]++]`,
  ],
)

test(
  'while (expr) {st}',
  checkTokensMacro,
  stripIndent`
    function a() {
      while (b) {
        b++
      }
    }
  `,
  [
    `${STATEMENT}:While[${EXPRESSION}:Identifier[b]]`,
    `${EXPRESSION}:Update[${EXPRESSION}:Identifier[b]++]`,
  ],
)
