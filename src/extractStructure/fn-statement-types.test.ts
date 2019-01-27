import test, { Macro } from 'ava'
import { stripIndent } from 'common-tags'
import isPlainObject from 'lodash/fp/isPlainObject'
import { extractStructure } from './index'
import { DIRECTIVE, STATEMENT } from './tags'

const checkTypesMacro: Macro = async (t, content: string, expected: string[]) => {
  const structure = await extractStructure({ content })
  const [firstFn] = structure.functionSignature

  t.true(isPlainObject(firstFn))
  t.deepEqual(expected.sort(), firstFn.fnStatementTypes)

  if (t.title !== 'empty' && expected.length === 0) {
    t.fail('Expected array is empty. Test case is most likely missing.')
  }
}

test(
  'statement types are correct',
  checkTypesMacro,
  stripIndent`
    function a() {
      'use strict';

      var a = 1;
      function b(par) {
        return par + 1;
      }
      var c = b(a);

      for (var i = 0; i < c; i++) {
        console.log('hello');
      }

      return a / c;
    }
  `,
  [
    `t_${DIRECTIVE}:use strict`,
    `t_${STATEMENT}:VariableDeclaration`,
    `t_${STATEMENT}:FunctionDeclaration`,
    `t_${STATEMENT}:VariableDeclaration`,
    `t_${STATEMENT}:ForStatement`,
    `t_${STATEMENT}:ReturnStatement`,
  ],
)

test(
  'statement types: function declaration without semicolon',
  checkTypesMacro,
  stripIndent`
    function a() {
      function b() {}
    }
  `,
  [`t_${STATEMENT}:FunctionDeclaration`],
)

test(
  'statement types: function declaration with semicolon',
  checkTypesMacro,
  stripIndent`
    function a() {
      function b() {};
    }
  `,
  [`t_${STATEMENT}:FunctionDeclaration`, `t_${STATEMENT}:EmptyStatement`],
)
