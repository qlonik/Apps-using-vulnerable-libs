import test, { Macro, TestContext } from 'ava'
import { stripIndent } from 'common-tags'
import { isPlainObject } from 'lodash'
import { extractStructure } from './index'
import { DECLARATION, DIRECTIVE, EXPRESSION, LITERAL, STATEMENT } from './tags'


const checkTokensMacro: Macro<TestContext> = async (
  t: TestContext, content: string, expected: string[]) => {

  const structure = await extractStructure({ content })
  const [firstFn] = structure

  t.true(isPlainObject(firstFn))
  t.deepEqual(expected.sort(), firstFn.fnStatementTokens)

  // add exception for 'empty' test case
  if (t.title !== 'empty' && expected.length === 0) {
    t.fail('Expected array is empty. Test case is most likely missing.')
  }
}

test('empty', checkTokensMacro,
  stripIndent`
    function a() {
      {}
    }
  `,
  [])

test('directive', checkTokensMacro,
  stripIndent`
    function a() {
      'use strict';
      'more directives';
    }
  `,
  [
    `${DIRECTIVE}:use strict`,
    `${DIRECTIVE}:more directives`,
  ])

test('literal', checkTokensMacro,
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
  ])

test('expression statement: with object', checkTokensMacro,
  stripIndent`
    function a() {
      ({});
    }
  `,
  [
    `${EXPRESSION}:Object`,
  ])

;[
  "+", "-", "/", "%", "*", "**", "&", "|", ">>", ">>>", "<<", "^", "==", "===", "!=", "!==", "in",
  "instanceof", ">", "<", ">=", "<=",
].forEach((op) => {
  test(`binary expr: "${op}"`, checkTokensMacro,
    stripIndent`
      function a() {
        1 ${op} 2;
      }
    `,
    [
      `${EXPRESSION}:Binary[${LITERAL}:Numeric ${op} ${LITERAL}:Numeric]`,
    ])
})

test('update expr', checkTokensMacro,
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
  ])

test('for: basic', checkTokensMacro,
  stripIndent`
    function a() {
      for (;;) {}
    }
  `,
  [
    `${STATEMENT}:For`,
  ])

test('for: with initialization', checkTokensMacro,
  stripIndent`
    function a() {
      for (var i = 0, l = 10; i < l; i++) {}
    }
  `,
  [
    `${STATEMENT}:For`,
    `${DECLARATION}:Variable[i = ${LITERAL}:Numeric]`,
    `${DECLARATION}:Variable[l = ${LITERAL}:Numeric]`,
    `${EXPRESSION}:Binary[${EXPRESSION}:Identifier[i] < ${EXPRESSION}:Identifier[l]]`,
    `${EXPRESSION}:Update[${EXPRESSION}:Identifier[i]++]`,
  ])

test('variable declaration: simple', checkTokensMacro,
  stripIndent`
    function a() {
      var b, c;
    }
  `,
  [
    `${DECLARATION}:Variable[b]`,
    `${DECLARATION}:Variable[c]`,
  ])

test('variable declaration: literals', checkTokensMacro,
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
    `${DECLARATION}:Variable[d = ${LITERAL}:Numeric]`,
    `${DECLARATION}:Variable[e = ${LITERAL}:String]`,
    `${DECLARATION}:Variable[f = ${LITERAL}:Boolean]`,
    `${DECLARATION}:Variable[g = ${LITERAL}:Null]`,
    `${DECLARATION}:Variable[h = ${LITERAL}:RegExp]`,
    `${DECLARATION}:Variable[i = ${LITERAL}:Template]`,
  ])

test.skip('variable declaration: other objects', checkTokensMacro,
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
    `${DECLARATION}:Variable[b = ${EXPRESSION}:Object]`,
  ])

test('if: single', checkTokensMacro,
  stripIndent`
    function a() {
      if (i === 1) {}
    }
  `,
  [
    `${STATEMENT}:If`,
  ])

test('if: if else', checkTokensMacro,
  stripIndent`
    function a() {
      if (i === 1) {}
      else {}
    }
  `,
  [
    `${STATEMENT}:If`,
  ])

test('if: if else{if else}', checkTokensMacro,
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
    `${STATEMENT}:If`,
    `${STATEMENT}:If`,
  ])

test('if: if else-if else-if else', checkTokensMacro,
  stripIndent`
    function a() {
      if (i === 1) {}
      else if (i === 2) {}
      else if (i === 3) {}
      else {}
    }
  `,
  [
    `${STATEMENT}:If`,
    `${STATEMENT}:Else-If`,
    `${STATEMENT}:Else-If`,
  ])
