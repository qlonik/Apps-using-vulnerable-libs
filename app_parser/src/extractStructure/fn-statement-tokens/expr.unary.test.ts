import { test } from 'ava'
import { stripIndent } from 'common-tags'
import { EXPRESSION } from '../tags'
import { checkTokensMacro } from './_macros'

test(
  '- expr',
  checkTokensMacro,
  stripIndent`
    function a() {
      - b;
    }
  `,
  [`${EXPRESSION}:Unary[- ${EXPRESSION}:Identifier[b]]`],
)

test(
  '+ expr',
  checkTokensMacro,
  stripIndent`
    function a() {
      + b;
    }
  `,
  [`${EXPRESSION}:Unary[+ ${EXPRESSION}:Identifier[b]]`],
)

test(
  '! expr',
  checkTokensMacro,
  stripIndent`
    function a() {
      ! b;
    }
  `,
  [`${EXPRESSION}:Unary[! ${EXPRESSION}:Identifier[b]]`],
)

test(
  '~ expr',
  checkTokensMacro,
  stripIndent`
    function a() {
      ~ b;
    }
  `,
  [`${EXPRESSION}:Unary[~ ${EXPRESSION}:Identifier[b]]`],
)

test(
  'typeof expr',
  checkTokensMacro,
  stripIndent`
    function a() {
      typeof b;
    }
  `,
  [`${EXPRESSION}:Unary[typeof ${EXPRESSION}:Identifier[b]]`],
)

test(
  'void expr',
  checkTokensMacro,
  stripIndent`
    function a() {
      void b;
    }
  `,
  [`${EXPRESSION}:Unary[void ${EXPRESSION}:Identifier[b]]`],
)

test(
  'delete expr',
  checkTokensMacro,
  stripIndent`
    function a() {
      delete b;
    }
  `,
  [`${EXPRESSION}:Unary[delete ${EXPRESSION}:Identifier[b]]`],
)
