import test from 'ava'
import { stripIndent } from 'common-tags'
import { EXPRESSION, LITERAL, PARAM, STATEMENT } from '../tags'
import { checkTokensMacro } from './_macros'

test(
  'single',
  checkTokensMacro,
  stripIndent`
    function a() {
      if (i === 1) {}
    }
  `,
  [`${STATEMENT}:If[${EXPRESSION}:Binary[${EXPRESSION}:Identifier[i] === ${LITERAL}:Numeric]]`],
)

test(
  'if expr',
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
  'if {expr}',
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
  'if else',
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
  'if expr else',
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
  'if {expr} else',
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
  'if else expr',
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
  'if else {expr}',
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
  'if else {if else}',
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
  'if else {if {expr} else}',
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
  'if else-if else-if else',
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
