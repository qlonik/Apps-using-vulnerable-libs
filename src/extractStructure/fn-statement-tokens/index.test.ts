import test from 'ava'
import { stripIndent } from 'common-tags'
import { EXTRACTOR_VERSION } from '../options'
import { DIRECTIVE, PARAM } from '../tags'
import { checkTokensMacro } from './_macros'

test(
  'empty function',
  checkTokensMacro,
  stripIndent`
    function a() {
    }
  `,
  [],
)

test(
  'parameters',
  checkTokensMacro,
  stripIndent`
    function a(par1, par2) {
    }
  `,
  [`${PARAM}:Identifier[par1]`, `${PARAM}:Identifier[par2]`],
  { 'extractor-version': EXTRACTOR_VERSION.v1 },
)

test(
  'parameters v2',
  checkTokensMacro,
  stripIndent`
    function a(par1, par2) {
    }
  `,
  [],
  { 'extractor-version': EXTRACTOR_VERSION.v2 },
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
