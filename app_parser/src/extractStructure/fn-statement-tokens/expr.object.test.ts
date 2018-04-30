import { test } from 'ava'
import { oneLineTrim, stripIndent } from 'common-tags'
import { EXPRESSION, LITERAL, UNKNOWN } from '../tags'
import { checkThrows, checkTokensMacro } from './_macros'

test(
  'empty',
  checkTokensMacro,
  stripIndent`
    function a() {
      ({});
    }
  `,
  [`${EXPRESSION}:Object`],
)

test(
  'key-value',
  checkTokensMacro,
  stripIndent`
    function a() {
      ({ b: 123 });
    }
  `,
  [`${EXPRESSION}:Object[${EXPRESSION}:Identifier[b] : ${LITERAL}:Numeric]`],
)

test(
  'multiple key-values',
  checkTokensMacro,
  stripIndent`
    function a() {
      ({ b: 123, c: '123' });
    }
  `,
  [
    oneLineTrim`
      ${EXPRESSION}:Object[
        ${EXPRESSION}:Identifier[b] : ${LITERAL}:Numeric
      , ${EXPRESSION}:Identifier[c] : ${LITERAL}:String
      ]
    `,
  ],
)

test(
  'shorthand',
  checkTokensMacro,
  stripIndent`
    function a() {
      ({ b });
    }
  `,
  [`${EXPRESSION}:Object[${EXPRESSION}:Identifier[b]]`],
)

test(
  'computed',
  checkTokensMacro,
  stripIndent`
    function a() {
      ({ [b + ' ']: 123 });
    }
  `,
  [
    oneLineTrim`
      ${EXPRESSION}:Object[
        ${EXPRESSION}:Binary[${EXPRESSION}:Identifier[b] + ${LITERAL}:String] : ${LITERAL}:Numeric
      ]
    `,
  ],
)

test(
  'computed shorthand',
  checkThrows,
  stripIndent`
    function a() {
      ({ [b + ' '] });
    }
  `,
)

test(
  'method',
  checkTokensMacro,
  stripIndent`
    function a() {
       ({ b() {} });
    }
  `,
  [`${EXPRESSION}:Object[${UNKNOWN}:Method[${EXPRESSION}:Identifier[b]]]`],
)

test(
  'multiple methods',
  checkTokensMacro,
  stripIndent`
    function a() {
       ({ b() {}, c() {} });
    }
  `,
  [
    oneLineTrim`
      ${EXPRESSION}:Object[
        ${UNKNOWN}:Method[${EXPRESSION}:Identifier[b]]
      , ${UNKNOWN}:Method[${EXPRESSION}:Identifier[c]]
      ]
    `,
  ],
)

test(
  'get method',
  checkTokensMacro,
  stripIndent`
    function a() {
       ({ get b () {} });
    }
  `,
  [`${EXPRESSION}:Object[${UNKNOWN}:Method[< ${EXPRESSION}:Identifier[b]]]`],
)

test(
  'set method',
  checkTokensMacro,
  stripIndent`
    function a() {
       ({ set b (value) {} });
    }
  `,
  [`${EXPRESSION}:Object[${UNKNOWN}:Method[> ${EXPRESSION}:Identifier[b]]]`],
)

test(
  'spread',
  checkThrows,
  stripIndent`
    function a() {
      ({ ...b });
    }
  `,
  [`${EXPRESSION}:Object[...${EXPRESSION}:Identifier[b]]`],
)
