import { test } from 'ava'
import { stripIndent } from 'common-tags'
import { EXPRESSION } from '../tags'
import { checkTokensMacro } from './_macros'

test(
  'simple',
  checkTokensMacro,
  stripIndent`
    function a() {
      b();
      (() => {})();
      (function c() {})();
      (function () {})();
    }
  `,
  [
    `${EXPRESSION}:Call[${EXPRESSION}:Identifier[b]()]`,
    `${EXPRESSION}:Call[${EXPRESSION}:ArrowFunction()]`,
    `${EXPRESSION}:Call[${EXPRESSION}:Function[${EXPRESSION}:Identifier[c]]()]`,
    `${EXPRESSION}:Call[${EXPRESSION}:Function[anonymous]()]`,
  ],
)

test.failing.skip(
  'super',
  checkTokensMacro,
  stripIndent`
    function a() {
      class b {
        constructor() {
          super();
        }
      }
    }
  `,
  [`${EXPRESSION}:Call[super]`],
)
