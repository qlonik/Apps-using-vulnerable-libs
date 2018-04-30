import { test } from 'ava'
import { stripIndent } from 'common-tags'
import { DIRECTIVE, PARAM } from '../tags'
import { checkTokensMacro } from './_macros'

test(
  'parameters',
  checkTokensMacro,
  stripIndent`
    function a(par1, par2) {
    }
  `,
  [`${PARAM}:Identifier[par1]`, `${PARAM}:Identifier[par2]`],
)

test(
  'directive',
  checkTokensMacro,
  stripIndent`
    function a() {
      'use strict';
      'more directives';
    }
  `,
  [`${DIRECTIVE}:use strict`, `${DIRECTIVE}:more directives`],
)
