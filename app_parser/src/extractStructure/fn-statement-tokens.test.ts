import { test, Macro } from 'ava'
import { oneLineTrim, stripIndent } from 'common-tags'
import { isPlainObject } from 'lodash'
import { extractStructure } from './index'
import { DECLARATION, DIRECTIVE, EXPRESSION, LITERAL, PARAM, STATEMENT } from './tags'

const checkTokensMacro: Macro = async (t, content: string, expected: string[]) => {
  const structure = await extractStructure({ content })
  const [firstFn] = structure.functionSignature

  t.true(isPlainObject(firstFn))
  t.deepEqual(expected.sort(), firstFn.fnStatementTokens)

  // add exception for 'empty' test case
  if (t.title !== 'empty' && expected.length === 0) {
    t.fail('Expected array is empty. Test case is most likely missing.')
  }
}

test(
  'empty',
  checkTokensMacro,
  stripIndent`
    function a() {
      {}
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

test(
  'literal',
  checkTokensMacro,
  stripIndent`
    function a() {
      1;
      '1';
      true;
      null;
      /.*/;
      \`template\`;
    }
  `,
  [
    `${LITERAL}:Numeric`,
    `${LITERAL}:String`,
    `${LITERAL}:Boolean`,
    `${LITERAL}:Null`,
    `${LITERAL}:RegExp`,
    `${LITERAL}:Template`,
  ],
)

test(
  'expression statement: with object',
  checkTokensMacro,
  stripIndent`
    function a() {
      ({});
    }
  `,
  [`${EXPRESSION}:Object`],
)
;[
  '+',
  '-',
  '/',
  '%',
  '*',
  '**',
  '&',
  '|',
  '>>',
  '>>>',
  '<<',
  '^',
  '==',
  '===',
  '!=',
  '!==',
  'in',
  'instanceof',
  '>',
  '<',
  '>=',
  '<=',
].forEach(op => {
  test(
    `binary expr: "${op}"`,
    checkTokensMacro,
    stripIndent`
      function a() {
        1 ${op} 2;
      }
    `,
    [`${EXPRESSION}:Binary[${LITERAL}:Numeric ${op} ${LITERAL}:Numeric]`],
  )
})

test(
  'binary expr: three elems',
  checkTokensMacro,
  stripIndent`
    function a() {
      1 + 2 + 3;
    }
  `,
  [
    oneLineTrim`${EXPRESSION}:Binary[
      ${EXPRESSION}:Binary[
        ${LITERAL}:Numeric + ${LITERAL}:Numeric
      ] + ${LITERAL}:Numeric
    ]`,
  ],
)

test(
  'update expr',
  checkTokensMacro,
  stripIndent`
    function a() {
      i++;
      ++i;
      i--;
      --i;
    }
  `,
  [
    `${EXPRESSION}:Update[${EXPRESSION}:Identifier[i]++]`,
    `${EXPRESSION}:Update[++${EXPRESSION}:Identifier[i]]`,
    `${EXPRESSION}:Update[${EXPRESSION}:Identifier[i]--]`,
    `${EXPRESSION}:Update[--${EXPRESSION}:Identifier[i]]`,
  ],
)

test(
  'for: basic',
  checkTokensMacro,
  stripIndent`
    function a() {
      for (;;) {}
    }
  `,
  [`${STATEMENT}:For`],
)

test(
  'for: with statement init',
  checkTokensMacro,
  stripIndent`
    function a() {
      for (var i = 0;;) {}
    }
  `,
  [`${STATEMENT}:For`, `${DECLARATION}:Variable[${PARAM}:Identifier[i] = ${LITERAL}:Numeric]`],
)

test(
  'for: with expression init',
  checkTokensMacro,
  stripIndent`
    function a() {
      for (i = 0;;) {}
    }
  `,
  [`${STATEMENT}:For`, `${EXPRESSION}:Assignment[${PARAM}:Identifier[i] = ${LITERAL}:Numeric]`],
)

test(
  'for: with test',
  checkTokensMacro,
  stripIndent`
    function a() {
      for (;i < 10;) {}
    }
  `,
  [`${STATEMENT}:For`, `${EXPRESSION}:Binary[${EXPRESSION}:Identifier[i] < ${LITERAL}:Numeric]`],
)

test(
  'for: with update',
  checkTokensMacro,
  stripIndent`
    function a() {
      for (;;i++) {}
    }
  `,
  [`${STATEMENT}:For`, `${EXPRESSION}:Update[${EXPRESSION}:Identifier[i]++]`],
)

test(
  'for: with expression body',
  checkTokensMacro,
  stripIndent`
    function a() {
      for (;;) i++;
    }
  `,
  [`${STATEMENT}:For`, `${EXPRESSION}:Update[${EXPRESSION}:Identifier[i]++]`],
)

test(
  'for: with statement body',
  checkTokensMacro,
  stripIndent`
    function a() {
      for (;;) {
        i++;
      }
    }
  `,
  [`${STATEMENT}:For`, `${EXPRESSION}:Update[${EXPRESSION}:Identifier[i]++]`],
)

test(
  'for: full test',
  checkTokensMacro,
  stripIndent`
    function a() {
      for (var i = 0, l = 10; i < l; i++) {
        l--;
      }
    }
  `,
  [
    `${STATEMENT}:For`,
    `${DECLARATION}:Variable[${PARAM}:Identifier[i] = ${LITERAL}:Numeric]`,
    `${DECLARATION}:Variable[${PARAM}:Identifier[l] = ${LITERAL}:Numeric]`,
    `${EXPRESSION}:Binary[${EXPRESSION}:Identifier[i] < ${EXPRESSION}:Identifier[l]]`,
    `${EXPRESSION}:Update[${EXPRESSION}:Identifier[i]++]`,
    `${EXPRESSION}:Update[${EXPRESSION}:Identifier[l]--]`,
  ],
)

test(
  'variable declaration: simple',
  checkTokensMacro,
  stripIndent`
    function a() {
      var b, c;
    }
  `,
  [
    `${DECLARATION}:Variable[${PARAM}:Identifier[b]]`,
    `${DECLARATION}:Variable[${PARAM}:Identifier[c]]`,
  ],
)

test(
  'variable declaration: literals',
  checkTokensMacro,
  stripIndent`
    function a() {
      let d = 1;
      var e = 'str';
      var f = false;
      var g = null;
      var h = /.*/;
      var i = \`template\`;
    }
  `,
  [
    `${DECLARATION}:Variable[${PARAM}:Identifier[d] = ${LITERAL}:Numeric]`,
    `${DECLARATION}:Variable[${PARAM}:Identifier[e] = ${LITERAL}:String]`,
    `${DECLARATION}:Variable[${PARAM}:Identifier[f] = ${LITERAL}:Boolean]`,
    `${DECLARATION}:Variable[${PARAM}:Identifier[g] = ${LITERAL}:Null]`,
    `${DECLARATION}:Variable[${PARAM}:Identifier[h] = ${LITERAL}:RegExp]`,
    `${DECLARATION}:Variable[${PARAM}:Identifier[i] = ${LITERAL}:Template]`,
  ],
)

test.failing.skip(
  'variable declaration: other objects',
  checkTokensMacro,
  stripIndent`
    function a() {
      var b = { a: 1, b: '2', c: true };
      var c = b;
      var d = b.a;
      var e = b.a + b.b;
      var f = function () {};
      var g = () => {};
      var h = b.c ? 'true' : 'false';
    }
  `,
  [`${DECLARATION}:Variable[b = ${EXPRESSION}:Object]`],
)

test(
  'if: single',
  checkTokensMacro,
  stripIndent`
    function a() {
      if (i === 1) {}
    }
  `,
  [`${STATEMENT}:If`],
)

test(
  'if: if else',
  checkTokensMacro,
  stripIndent`
    function a() {
      if (i === 1) {}
      else {}
    }
  `,
  [`${STATEMENT}:If`],
)

test(
  'if: if else {if else}',
  checkTokensMacro,
  stripIndent`
    function a() {
      if (i === 1) {}
      else {
        if (i === 2) {}
        else {}
      }
    }
  `,
  [`${STATEMENT}:If`, `${STATEMENT}:If`],
)

test(
  'if: if else-if else-if else',
  checkTokensMacro,
  stripIndent`
    function a() {
      if (i === 1) {}
      else if (i === 2) {}
      else if (i === 3) {}
      else {}
    }
  `,
  [`${STATEMENT}:If`, `${STATEMENT}:Else-If`, `${STATEMENT}:Else-If`],
)

test(
  'function declaration',
  checkTokensMacro,
  stripIndent`
    function a() {
      function b() {};
    }
  `,
  [`${DECLARATION}:Function[${EXPRESSION}:Identifier[b]]`],
)

test(
  "function expression: 'function' keyword",
  checkTokensMacro,
  stripIndent`
    function a() {
      var b = function () {};
      (function c() {});
      (function () {});
    }
  `,
  [
    `${DECLARATION}:Variable[${PARAM}:Identifier[b] = ${EXPRESSION}:Function[anonymous]]`,
    `${EXPRESSION}:Function[${EXPRESSION}:Identifier[c]]`,
    `${EXPRESSION}:Function[anonymous]`,
  ],
)

test(
  'function expression: arrow function',
  checkTokensMacro,
  stripIndent`
    function a() {
      var b = () => {};
      (() => {});
    }
  `,
  [
    `${DECLARATION}:Variable[${PARAM}:Identifier[b] = ${EXPRESSION}:ArrowFunction]`,
    `${EXPRESSION}:ArrowFunction`,
  ],
)

test(
  'return statement: empty',
  checkTokensMacro,
  stripIndent`
    function a() {
      return;
    }
  `,
  [`${STATEMENT}:Return`],
)

test(
  'return statement: literal',
  checkTokensMacro,
  stripIndent`
    function a() {
      return 1;
    }
  `,
  [`${STATEMENT}:Return[${LITERAL}:Numeric]`],
)

test(
  'return statement: variable update',
  checkTokensMacro,
  stripIndent`
    function a() {
      var i = 0;
      return ++i;
    }
  `,
  [
    `${DECLARATION}:Variable[${PARAM}:Identifier[i] = ${LITERAL}:Numeric]`,
    `${STATEMENT}:Return[${EXPRESSION}:Update[++${EXPRESSION}:Identifier[i]]]`,
  ],
)

test(
  'debugger',
  checkTokensMacro,
  stripIndent`
    function a() {
      debugger;
    }
  `,
  [`${STATEMENT}:Debugger`],
)

test(
  'break',
  checkTokensMacro,
  stripIndent`
    function a() {
      for (;;) {
        break;
      }
    }
  `,
  [`${STATEMENT}:For`, `${STATEMENT}:Break`],
)

test(
  'continue',
  checkTokensMacro,
  stripIndent`
    function a() {
      for (;;) {
        continue;
      }
    }
  `,
  [`${STATEMENT}:For`, `${STATEMENT}:Continue`],
)

test(
  'call expression',
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
  'call expression: super',
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
;['=', '+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '>>>=', '|=', '^=', '&='].forEach(op => {
  test(
    `assignment expression: "${op}"`,
    checkTokensMacro,
    stripIndent`
      function a() {
        var a = 1, b = 1;
        b ${op} a;
      }
    `,
    [
      `${DECLARATION}:Variable[${PARAM}:Identifier[a] = ${LITERAL}:Numeric]`,
      `${DECLARATION}:Variable[${PARAM}:Identifier[b] = ${LITERAL}:Numeric]`,
      `${EXPRESSION}:Assignment[${PARAM}:Identifier[b] ${op} ${EXPRESSION}:Identifier[a]]`,
    ],
  )
})
