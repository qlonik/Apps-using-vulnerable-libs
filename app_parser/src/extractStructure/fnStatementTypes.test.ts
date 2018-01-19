import test from 'ava'
import { stripIndent } from "common-tags"
import { isPlainObject } from 'lodash'
import { extractStructure } from './index'
import { DIRECTIVE, STATEMENT } from './tags'


test('statement types are correct', async t => {
  const content = stripIndent`
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
  `
  const expected = [
    `t_${DIRECTIVE}:use strict`,
    `t_${STATEMENT}:VariableDeclaration`,
    `t_${STATEMENT}:FunctionDeclaration`,
    `t_${STATEMENT}:VariableDeclaration`,
    `t_${STATEMENT}:ForStatement`,
    `t_${STATEMENT}:ReturnStatement`,
  ]

  const structure = await extractStructure({ content })
  const [firstFn] = structure

  t.true(isPlainObject(firstFn))
  t.deepEqual(expected.sort(), firstFn.fnStatementTypes)
})
