import { test } from 'ava'
import { stripIndent } from 'common-tags'
import { EXPRESSION } from '../tags'
import { checkTokensMacro } from './_macros'

test(
  '[]',
  checkTokensMacro,
  stripIndent`
    function a() {
      [];
    }
  `,
  [`${EXPRESSION}:Array`],
)

test(
  '[expr]',
  checkTokensMacro,
  stripIndent`
    function a() {
      [b];
    }
  `,
  [`${EXPRESSION}:Array[${EXPRESSION}:Identifier[b]]`],
)

test(
  '[expr, expr]',
  checkTokensMacro,
  stripIndent`
    function a() {
      [b, c];
    }
  `,
  [`${EXPRESSION}:Array[${EXPRESSION}:Identifier[b], ${EXPRESSION}:Identifier[c]]`],
)

test(
  '[...expr]',
  checkTokensMacro,
  stripIndent`
    function a() {
      [...b];
    }
  `,
  [`${EXPRESSION}:Array[...${EXPRESSION}:Identifier[b]]`],
)

test(
  '[expr, ...expr]',
  checkTokensMacro,
  stripIndent`
    function a() {
      [b, ...c];
    }
  `,
  [`${EXPRESSION}:Array[${EXPRESSION}:Identifier[b], ...${EXPRESSION}:Identifier[c]]`],
)

test(
  '[...expr, expr]',
  checkTokensMacro,
  stripIndent`
    function a() {
      [...b, c];
    }
  `,
  [`${EXPRESSION}:Array[...${EXPRESSION}:Identifier[b], ${EXPRESSION}:Identifier[c]]`],
)

test(
  '[...expr, ...expr]',
  checkTokensMacro,
  stripIndent`
    function a() {
      [...b, ...c];
    }
  `,
  [`${EXPRESSION}:Array[...${EXPRESSION}:Identifier[b], ...${EXPRESSION}:Identifier[c]]`],
)
