import test from 'ava'
import { stripIndent } from 'common-tags'
import { EXPRESSION, STATEMENT } from '../tags'
import { checkThrows, checkTokensMacro } from './_macros'

test(
  'do while',
  checkThrows,
  stripIndent`
    function a() {
      do while;
    }
  `,
)

test(
  'do {} while',
  checkThrows,
  stripIndent`
    function a() {
      do {} while;
    }
  `,
)

test(
  'do {} while ()',
  checkThrows,
  stripIndent`
    function a() {
      do {} while ();
    }
  `,
)

test(
  'do {} while (test)',
  checkTokensMacro,
  stripIndent`
    function a() {
      do {} while (b);
    }
  `,
  [`${STATEMENT}:Do-While[${EXPRESSION}:Identifier[b]]`],
)

test(
  'do {st} while (test)',
  checkTokensMacro,
  stripIndent`
    function a() {
      do { b++ } while (b);
    }
  `,
  [
    `${EXPRESSION}:Update[${EXPRESSION}:Identifier[b]++]`,
    `${STATEMENT}:Do-While[${EXPRESSION}:Identifier[b]]`,
  ],
)

test(
  'do st; while (test)',
  checkTokensMacro,
  `
    function a() {
      do b++; while (b);
    }
  `,
  [
    `${EXPRESSION}:Update[${EXPRESSION}:Identifier[b]++]`,
    `${STATEMENT}:Do-While[${EXPRESSION}:Identifier[b]]`,
  ],
)

test(
  'do st \\n while (test)',
  checkTokensMacro,
  `
    function a() {
      do b++
      while (b);
    }
  `,
  [
    `${EXPRESSION}:Update[${EXPRESSION}:Identifier[b]++]`,
    `${STATEMENT}:Do-While[${EXPRESSION}:Identifier[b]]`,
  ],
)
