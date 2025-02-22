import test from 'ava'
import { oneLineTrim, stripIndent } from 'common-tags'
import { DECLARATION, EXPRESSION, LITERAL, PARAM, STATEMENT } from '../tags'
import { checkSameSignature, checkTokensMacro } from './_macros'

test(
  'empty block',
  checkTokensMacro,
  stripIndent`
    function a() {
      {}
    }
  `,
  [],
)

test(
  'block is flattened',
  checkSameSignature,
  stripIndent`
    function a() {
      var b = 123;
    }
  `,
  stripIndent`
    function a() {
      {
        var b = 123;
      }
    }
  `,
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
  'labeled',
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
  'break label',
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
  'continue label',
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
  'switch {case, case, default}',
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

test(
  'with',
  checkTokensMacro,
  stripIndent`
    function a() {
      with (b) {
        hello++;
      }
    }
  `,
  [
    `${STATEMENT}:With[${EXPRESSION}:Identifier[b]]`,
    `${EXPRESSION}:Update[${EXPRESSION}:Identifier[hello]++]`,
  ],
)
