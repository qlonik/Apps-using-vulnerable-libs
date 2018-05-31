import { test } from 'ava'
import { oneLineTrim, stripIndent } from 'common-tags'
import { DECLARATION, EXPRESSION, LITERAL, PARAM } from '../tags'
import { checkTokensMacro } from './_macros'
import { EXTRACTOR_VERSION } from './index'

test(
  'declaration',
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
  'declaration + literal assignment',
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
  'declaration + other objects assignment',
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
  'empty declarations are skipped with v2',
  checkTokensMacro,
  stripIndent`
    function a() {
      var b;
      let c;
      '123';
    }
  `,
  [`${LITERAL}:String`],
  { v: EXTRACTOR_VERSION.v2 },
)

test(
  'non-empty declaration is parsed with v2',
  checkTokensMacro,
  `
    function a() {
      var b = 123;
    }
  `,
  [`${DECLARATION}:Variable[${PARAM}:Identifier[b] = ${LITERAL}:Numeric]`],
  { v: EXTRACTOR_VERSION.v2 },
)
