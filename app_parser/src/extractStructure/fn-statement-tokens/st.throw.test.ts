import { test } from 'ava'
import { stripIndent } from 'common-tags'
import { EXPRESSION, LITERAL, STATEMENT } from '../tags'
import { checkThrows, checkTokensMacro } from './_macros'

test(
  'statement: throw',
  checkThrows,
  stripIndent`
    function a() {
      throw;
    }
  `,
)

test(
  'statement: throw string',
  checkTokensMacro,
  stripIndent`
    function a() {
      throw 'string';
    }
  `,
  [`${STATEMENT}:Throw[${LITERAL}:String]`],
)

test(
  'statement: throw new error',
  checkTokensMacro,
  stripIndent`
    function a() {
      throw new Error('string');
    }
  `,
  [`${STATEMENT}:Throw[${EXPRESSION}:New[${EXPRESSION}:Identifier[Error](${LITERAL}:String)]]`],
)
