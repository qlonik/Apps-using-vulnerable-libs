import { test } from 'ava'
import { stripIndent } from 'common-tags'
import { EXPRESSION } from '../tags'
import { checkTokensMacro } from './_macros'

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
