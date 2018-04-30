import { test } from 'ava'
import { oneLineTrim, stripIndent } from 'common-tags'
import { DECLARATION, DIRECTIVE, EXPRESSION, LITERAL, PARAM, STATEMENT, UNKNOWN } from '../tags'
import { checkThrows, checkTokensMacro } from './_macros'

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
      /.*/g;
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
  'object ex: empty',
  checkTokensMacro,
  stripIndent`
    function a() {
      ({});
    }
  `,
  [`${EXPRESSION}:Object`],
)

test(
  'object ex: key-value',
  checkTokensMacro,
  stripIndent`
    function a() {
      ({ b: 123 });
    }
  `,
  [`${EXPRESSION}:Object[${EXPRESSION}:Identifier[b] : ${LITERAL}:Numeric]`],
)

test(
  'object ex: multiple key-values',
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
  'object ex: shorthand',
  checkTokensMacro,
  stripIndent`
    function a() {
      ({ b });
    }
  `,
  [`${EXPRESSION}:Object[${EXPRESSION}:Identifier[b]]`],
)

test(
  'object ex: computed',
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
  'object ex: computed shorthand',
  checkThrows,
  stripIndent`
    function a() {
      ({ [b + ' '] });
    }
  `,
)

test(
  'object ex: method',
  checkTokensMacro,
  stripIndent`
    function a() {
       ({ b() {} });
    }
  `,
  [`${EXPRESSION}:Object[${UNKNOWN}:Method[${EXPRESSION}:Identifier[b]]]`],
)

test(
  'object ex: multiple methods',
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
  'object ex: get method',
  checkTokensMacro,
  stripIndent`
    function a() {
       ({ get b () {} });
    }
  `,
  [`${EXPRESSION}:Object[${UNKNOWN}:Method[< ${EXPRESSION}:Identifier[b]]]`],
)

test(
  'object ex: set method',
  checkTokensMacro,
  stripIndent`
    function a() {
       ({ set b (value) {} });
    }
  `,
  [`${EXPRESSION}:Object[${UNKNOWN}:Method[> ${EXPRESSION}:Identifier[b]]]`],
)

test(
  'object ex: spread',
  checkThrows,
  stripIndent`
    function a() {
      ({ ...b });
    }
  `,
  [`${EXPRESSION}:Object[...${EXPRESSION}:Identifier[b]]`],
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
  'for-in',
  checkTokensMacro,
  stripIndent`
    function a() {
      for (let b in {}) {
        c = 123
      }
    }
  `,
  [
    `${STATEMENT}:For-In`,
    `${DECLARATION}:Variable[${PARAM}:Identifier[b]]`,
    `${EXPRESSION}:Object`,
    `${EXPRESSION}:Assignment[${PARAM}:Identifier[c] = ${LITERAL}:Numeric]`,
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

test(
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
  [
    oneLineTrim`
      ${DECLARATION}:Variable[
        ${PARAM}:Identifier[b] = ${EXPRESSION}:Object[
          ${EXPRESSION}:Identifier[a] : ${LITERAL}:Numeric
        , ${EXPRESSION}:Identifier[b] : ${LITERAL}:String
        , ${EXPRESSION}:Identifier[c] : ${LITERAL}:Boolean
        ]
      ]
    `,
    `${DECLARATION}:Variable[${PARAM}:Identifier[c] = ${EXPRESSION}:Identifier[b]]`,
    oneLineTrim`
      ${DECLARATION}:Variable[
        ${PARAM}:Identifier[d] = ${EXPRESSION}:Member[
          ${EXPRESSION}:Identifier[b] >>> ${EXPRESSION}:Identifier[a]
        ]
      ]
    `,
    oneLineTrim`
      ${DECLARATION}:Variable[${PARAM}:Identifier[e] = ${EXPRESSION}:Binary[
        ${EXPRESSION}:Member[
          ${EXPRESSION}:Identifier[b] >>> ${EXPRESSION}:Identifier[a]
        ] + ${EXPRESSION}:Member[
          ${EXPRESSION}:Identifier[b] >>> ${EXPRESSION}:Identifier[b]
        ]
      ]]
    `,
    `${DECLARATION}:Variable[${PARAM}:Identifier[f] = ${EXPRESSION}:Function[anonymous]]`,
    `${DECLARATION}:Variable[${PARAM}:Identifier[g] = ${EXPRESSION}:ArrowFunction]`,
    oneLineTrim`
      ${DECLARATION}:Variable[${PARAM}:Identifier[h] = ${EXPRESSION}:Conditional[
        ${EXPRESSION}:Member[
          ${EXPRESSION}:Identifier[b] >>> ${EXPRESSION}:Identifier[c]
        ] ? ${LITERAL}:String : ${LITERAL}:String
      ]]
    `,
  ],
)

test(
  'if: single',
  checkTokensMacro,
  stripIndent`
    function a() {
      if (i === 1) {}
    }
  `,
  [`${STATEMENT}:If[${EXPRESSION}:Binary[${EXPRESSION}:Identifier[i] === ${LITERAL}:Numeric]]`],
)

test(
  'if: if expr',
  checkTokensMacro,
  stripIndent`
    function a() {
      if (i === 1) b = 123
    }
  `,
  [
    `${STATEMENT}:If[${EXPRESSION}:Binary[${EXPRESSION}:Identifier[i] === ${LITERAL}:Numeric]]`,
    `${EXPRESSION}:Assignment[${PARAM}:Identifier[b] = ${LITERAL}:Numeric]`,
  ],
)

test(
  'if: if {expr}',
  checkTokensMacro,
  stripIndent`
    function a() {
      if (i === 1) {
        b = 123;
      }
    }
  `,
  [
    `${STATEMENT}:If[${EXPRESSION}:Binary[${EXPRESSION}:Identifier[i] === ${LITERAL}:Numeric]]`,
    `${EXPRESSION}:Assignment[${PARAM}:Identifier[b] = ${LITERAL}:Numeric]`,
  ],
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
  [
    `${STATEMENT}:If[${EXPRESSION}:Binary[${EXPRESSION}:Identifier[i] === ${LITERAL}:Numeric]]`,
    `${STATEMENT}:Else`,
  ],
)

test(
  'if: if expr else',
  checkTokensMacro,
  stripIndent`
    function a() {
      if (i === 1) b = 123
      else {}
    }
  `,
  [
    `${STATEMENT}:If[${EXPRESSION}:Binary[${EXPRESSION}:Identifier[i] === ${LITERAL}:Numeric]]`,
    `${EXPRESSION}:Assignment[${PARAM}:Identifier[b] = ${LITERAL}:Numeric]`,
    `${STATEMENT}:Else`,
  ],
)

test(
  'if: if {expr} else',
  checkTokensMacro,
  stripIndent`
    function a() {
      if (i === 1) {
        b = 123
      }
      else {}
    }
  `,
  [
    `${STATEMENT}:If[${EXPRESSION}:Binary[${EXPRESSION}:Identifier[i] === ${LITERAL}:Numeric]]`,
    `${EXPRESSION}:Assignment[${PARAM}:Identifier[b] = ${LITERAL}:Numeric]`,
    `${STATEMENT}:Else`,
  ],
)

test(
  'if: if else expr',
  checkTokensMacro,
  stripIndent`
    function a() {
      if (i === 1) {}
      else b = 123
    }
  `,
  [
    `${STATEMENT}:If[${EXPRESSION}:Binary[${EXPRESSION}:Identifier[i] === ${LITERAL}:Numeric]]`,
    `${STATEMENT}:Else`,
    `${EXPRESSION}:Assignment[${PARAM}:Identifier[b] = ${LITERAL}:Numeric]`,
  ],
)

test(
  'if: if else {expr}',
  checkTokensMacro,
  stripIndent`
    function a() {
      if (i === 1) {}
      else {
        b = 123;
      }
    }
  `,
  [
    `${STATEMENT}:If[${EXPRESSION}:Binary[${EXPRESSION}:Identifier[i] === ${LITERAL}:Numeric]]`,
    `${STATEMENT}:Else`,
    `${EXPRESSION}:Assignment[${PARAM}:Identifier[b] = ${LITERAL}:Numeric]`,
  ],
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
  [
    `${STATEMENT}:If[${EXPRESSION}:Binary[${EXPRESSION}:Identifier[i] === ${LITERAL}:Numeric]]`,
    `${STATEMENT}:Else`,
    `${STATEMENT}:If[${EXPRESSION}:Binary[${EXPRESSION}:Identifier[i] === ${LITERAL}:Numeric]]`,
    `${STATEMENT}:Else`,
  ],
)

test(
  'if: if else {if {expr} else}',
  checkTokensMacro,
  stripIndent`
    function a() {
      if (i === 1) {}
      else {
        if (i === 2) {
          b = 123
        }
        else {}
      }
    }
  `,
  [
    `${STATEMENT}:If[${EXPRESSION}:Binary[${EXPRESSION}:Identifier[i] === ${LITERAL}:Numeric]]`,
    `${STATEMENT}:Else`,
    `${STATEMENT}:If[${EXPRESSION}:Binary[${EXPRESSION}:Identifier[i] === ${LITERAL}:Numeric]]`,
    `${EXPRESSION}:Assignment[${PARAM}:Identifier[b] = ${LITERAL}:Numeric]`,
    `${STATEMENT}:Else`,
  ],
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
  [
    `${STATEMENT}:If[${EXPRESSION}:Binary[${EXPRESSION}:Identifier[i] === ${LITERAL}:Numeric]]`,
    `${STATEMENT}:Else-If[${EXPRESSION}:Binary[${EXPRESSION}:Identifier[i] === ${LITERAL}:Numeric]]`,
    `${STATEMENT}:Else-If[${EXPRESSION}:Binary[${EXPRESSION}:Identifier[i] === ${LITERAL}:Numeric]]`,
    `${STATEMENT}:Else`,
  ],
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
  'statement: break',
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
  'statement: break label',
  checkTokensMacro,
  stripIndent`
    function a() {
      label:
      for (;;) {
        break label;
      }
    }
  `,
  [
    `${STATEMENT}:Label[${PARAM}:Identifier[label]]`,
    `${STATEMENT}:For`,
    `${STATEMENT}:Break[${PARAM}:Identifier[label]]`,
  ],
)

test(
  'statement: continue',
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
  'statement: continue label',
  checkTokensMacro,
  stripIndent`
    function a() {
      label:
      for (;;) {
        continue label;
      }
    }
  `,
  [
    `${STATEMENT}:Label[${PARAM}:Identifier[label]]`,
    `${STATEMENT}:For`,
    `${STATEMENT}:Continue[${PARAM}:Identifier[label]]`,
  ],
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

test(
  'member expression',
  checkTokensMacro,
  stripIndent`
    function a() {
      b.c;
      b['c'];
    }
  `,
  [
    `${EXPRESSION}:Member[${EXPRESSION}:Identifier[b] >>> ${EXPRESSION}:Identifier[c]]`,
    `${EXPRESSION}:Member[${EXPRESSION}:Identifier[b] >c> ${LITERAL}:String]`,
  ],
)

test(
  'this expression',
  checkTokensMacro,
  stripIndent`
    function a() {
      this;
      this.b = 123;
    }
  `,
  [
    `${EXPRESSION}:This`,
    oneLineTrim`
      ${EXPRESSION}:Assignment[
        ${PARAM}:Member[
          ${EXPRESSION}:This >>> ${EXPRESSION}:Identifier[b]
        ] = ${LITERAL}:Numeric
      ]
    `,
  ],
)

test(
  'conditional expression',
  checkTokensMacro,
  stripIndent`
    function a() {
      b === 'b' ? 123 : 234
    }
  `,
  [
    oneLineTrim`
      ${EXPRESSION}:Conditional[
        ${EXPRESSION}:Binary[
          ${EXPRESSION}:Identifier[b] === ${LITERAL}:String
        ] ? ${LITERAL}:Numeric : ${LITERAL}:Numeric
      ]
    `,
  ],
)

test(
  'statement: do while',
  checkThrows,
  stripIndent`
    function a() {
      do while;
    }
  `,
)

test(
  'statement: do {} while',
  checkThrows,
  stripIndent`
    function a() {
      do {} while;
    }
  `,
)

test(
  'statement: do {} while ()',
  checkThrows,
  stripIndent`
    function a() {
      do {} while ();
    }
  `,
)

test(
  'statement: do {} while (test)',
  checkTokensMacro,
  stripIndent`
    function a() {
      do {} while (b);
    }
  `,
  [`${STATEMENT}:Do-While[${EXPRESSION}:Identifier[b]]`],
)

test(
  'statement: do {st} while (test)',
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
  'statement: do st; while (test)',
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
  'statement: do st \\n while (test)',
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

test(
  'statement: labeled',
  checkTokensMacro,
  stripIndent`
    function a() {
      label: b++;
    }
  `,
  [
    `${STATEMENT}:Label[${PARAM}:Identifier[label]]`,
    `${EXPRESSION}:Update[${EXPRESSION}:Identifier[b]++]`,
  ],
)

test(
  'statement: switch {case, case, default}',
  checkTokensMacro,
  stripIndent`
    function a() {
      var c;
      switch (b) {
        case 1:
          c = 1;
          break;
        case 2:
          c = 2;
          break;
        default:
          c = 0;
          break; 
      }
    }
  `,
  [
    `${DECLARATION}:Variable[${PARAM}:Identifier[c]]`,
    oneLineTrim`
      ${STATEMENT}:Switch[
        s ${EXPRESSION}:Identifier[b]
      ; c ${LITERAL}:Numeric
      , c ${LITERAL}:Numeric
      , c default
      ]
    `,
    `${EXPRESSION}:Assignment[${PARAM}:Identifier[c] = ${LITERAL}:Numeric]`,
    `${STATEMENT}:Break`,
    `${EXPRESSION}:Assignment[${PARAM}:Identifier[c] = ${LITERAL}:Numeric]`,
    `${STATEMENT}:Break`,
    `${EXPRESSION}:Assignment[${PARAM}:Identifier[c] = ${LITERAL}:Numeric]`,
    `${STATEMENT}:Break`,
  ],
)
