import test from 'ava'
import { isFunction } from 'babel-types'
import { parse } from 'babylon';
import { oneLineTrim, stripIndent } from 'common-tags'
import { Signature } from './nodeFilters/allFnsAndNames'
import { fnOnlyTreeCreator, rnDeclareFns } from './index'
import { DECLARATION, EXPRESSION, LITERAL, PARAM, STATEMENT } from './tags'
import { TreePath } from './visitNodes'


test('fn filtered correctly', t => {
  const fnB1 = stripIndent`
    function fn1() {
      var c = '1';
      return c;
    }
  `
  const fnB1_toks = [
    `${DECLARATION}:Variable[c = ${LITERAL}:String]`,
    `${STATEMENT}:Return[${EXPRESSION}:Identifier[c]]`,
  ]
  const fnB1_types = [
    `t_${STATEMENT}:VariableDeclaration`,
    `t_${STATEMENT}:ReturnStatement`,
  ]

  const fnB2 = stripIndent`
    function fn2(param) {
      return param + '2';
    }
  `
  const fnB2_toks = [
    `${PARAM}:Identifier[param]`,
    `${STATEMENT}:Return[${EXPRESSION}:Binary[${EXPRESSION}:Identifier[param] + ${LITERAL}:String]]`,
  ]
  const fnB2_types = [
    `t_${PARAM}:Identifier`,
    `t_${STATEMENT}:ReturnStatement`,
  ]

  const fnB = stripIndent`
    function () {
      ${fnB1}
      (${fnB2})(a);
    }
  `
  const fnB_toks = [
    `${DECLARATION}:Function[${EXPRESSION}:Identifier[fn1]]`,
    `${EXPRESSION}:Call[${EXPRESSION}:Function[${EXPRESSION}:Identifier[fn2]]]`,
  ]
  const fnB_types = [
    `t_${STATEMENT}:FunctionDeclaration`,
    `t_${STATEMENT}:ExpressionStatement`,
  ]

  const fnD = stripIndent`
    function fn3() {
      return 1 + 2 + 3;
    }
  `
  const fnD_toks = [
    oneLineTrim`
      ${STATEMENT}:Return[
        ${EXPRESSION}:Binary[
          ${EXPRESSION}:Binary[
            ${LITERAL}:Numeric + ${LITERAL}:Numeric
          ] + ${LITERAL}:Numeric
        ]
      ]
    `,
  ]
  const fnD_types = [
    `t_${STATEMENT}:ReturnStatement`,
  ]

  const code = stripIndent`
      var a = '1';
      var b = ${fnB}
      var d = ${fnD}
    `
  const expected: TreePath<Signature>[] = [{
    prop: 'program.body[1].declarations[0]',
    data: {
      type: 'fn',
      name: 'b',
      fnStatementTypes: fnB_types.sort(),
      fnStatementTokens: fnB_toks.sort(),
    },
    c: [{
      prop: 'program.body[1].declarations[0].init.body.body[0]',
      data: {
        type: 'fn',
        name: 'fn1',
        fnStatementTypes: fnB1_types.sort(),
        fnStatementTokens: fnB1_toks.sort(),
      },
    }, {
      prop: 'program.body[1].declarations[0].init.body.body[1].expression.callee',
      data: {
        type: 'fn',
        name: 'fn2',
        fnStatementTypes: fnB2_types.sort(),
        fnStatementTokens: fnB2_toks.sort(),
      },
    }],
  }, {
    prop: 'program.body[2].declarations[0]',
    data: {
      type: 'fn',
      name: 'fn3',
      fnStatementTypes: fnD_types.sort(),
      fnStatementTokens: fnD_toks.sort(),
    },
  }]

  t.deepEqual(expected, fnOnlyTreeCreator(parse(code)))
})

test('react-native: bundle filtered correctly', async t => {
  const content = stripIndent`
    !function a() {}(this)
    !function b() {}(this)
    !function c() {}(this)
    __d('0', [], function () {
      return 123;
    })
    __d(1, function () {
      return 234;
    })
    __d(function () {
      return 345;
    }, 2)
    __d(function () {
      return 456;
    }, 3, [])
  `
  const [first, second, third, fourth] = rnDeclareFns(parse(content))

  t.is(first.data!.id, '0')
  t.true(isFunction(<any>first.data!.factory))
  t.is(second.data!.id, 1)
  t.true(isFunction(<any>second.data!.factory))
  t.is(third.data!.id, 2)
  t.true(isFunction(<any>third.data!.factory))
  t.is(fourth.data!.id, 3)
  t.true(isFunction(<any>fourth.data!.factory))
})
