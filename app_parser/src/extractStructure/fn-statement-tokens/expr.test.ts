import { test } from 'ava'
import { oneLineTrim, stripIndent } from 'common-tags'
import { EXPRESSION, LITERAL, PARAM } from '../tags'
import { checkTokensMacro } from './_macros'

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
  'update',
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
  'conditional',
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
  'this',
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
  'member',
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

test(
  'new',
  checkTokensMacro,
  stripIndent`
    function a() {
      new b;
      new c();
    }
  `,
  [
    `${EXPRESSION}:New[${EXPRESSION}:Identifier[b]()]`,
    `${EXPRESSION}:New[${EXPRESSION}:Identifier[c]()]`,
  ],
)
