import { test } from 'ava'
import { isFunction } from 'babel-types'
import { parse } from 'babylon'
import { oneLineTrim, source, stripIndent } from 'common-tags'
import {
  collapseFnNamesTree,
  EXTRACTOR_VERSION,
  extractStructure,
  fnNamesConcat,
  fnOnlyTreeCreator,
  literalValues,
  rnDeclareFns,
} from './index'
import { Signature } from './nodeFilters/allFnsAndNames'
import { DECLARATION, EXPRESSION, LITERAL, PARAM, STATEMENT } from './tags'
import { TreePath } from './visit-nodes'

test('fn filtered correctly', async t => {
  const fnB1 = stripIndent`
    function fn1() {
      var c = '1';
      return c;
    }
  `
  const fnB1_toks = [
    `${DECLARATION}:Variable[${PARAM}:Identifier[c] = ${LITERAL}:String]`,
    `${STATEMENT}:Return[${EXPRESSION}:Identifier[c]]`,
  ]
  const fnB1_types = [`t_${STATEMENT}:VariableDeclaration`, `t_${STATEMENT}:ReturnStatement`]

  const fnB2 = stripIndent`
    function fn2(param) {
      return param + '2';
    }
  `
  const fnB2_toks = [
    `${PARAM}:Identifier[param]`,
    `${STATEMENT}:Return[${EXPRESSION}:Binary[${EXPRESSION}:Identifier[param] + ${LITERAL}:String]]`,
  ]
  const fnB2_types = [`t_${PARAM}:Identifier`, `t_${STATEMENT}:ReturnStatement`]

  const fnB = source`
    function () {
      ${fnB1}
      ${'(' + fnB2 + ')(a);'}
    }
  `
  const fnB_toks = [
    `${DECLARATION}:Function[${EXPRESSION}:Identifier[fn1]]`,
    oneLineTrim`
      ${EXPRESSION}:Call[
        ${EXPRESSION}:Function[${EXPRESSION}:Identifier[fn2]](${EXPRESSION}:Identifier[a])
      ]
    `,
  ]
  const fnB_types = [`t_${STATEMENT}:FunctionDeclaration`, `t_${STATEMENT}:ExpressionStatement`]

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
  const fnD_types = [`t_${STATEMENT}:ReturnStatement`]

  const code = source`
      var a = '1';
      ${`var b = ${fnB};`}
      ${`var d = ${fnD};`}
    `
  const expected: TreePath<Signature>[] = [
    {
      prop: 'program.body[1].declarations[0]',
      data: {
        index: -1,
        type: 'fn',
        name: 'b',
        loc: {
          start: { line: 2, column: 8 },
          end: { line: 10, column: 1 },
        },
        fnStatementTypes: fnB_types.sort(),
        fnStatementTokens: fnB_toks.sort(),
      },
      c: [
        {
          prop: 'program.body[1].declarations[0].init.body.body[0]',
          data: {
            index: -1,
            type: 'fn',
            name: 'fn1',
            loc: {
              start: { line: 3, column: 2 },
              end: { line: 6, column: 3 },
            },
            fnStatementTypes: fnB1_types.sort(),
            fnStatementTokens: fnB1_toks.sort(),
          },
        },
        {
          prop: 'program.body[1].declarations[0].init.body.body[1].expression.callee',
          data: {
            index: -1,
            type: 'fn',
            name: 'fn2',
            loc: {
              start: { line: 7, column: 3 },
              end: { line: 9, column: 3 },
            },
            fnStatementTypes: fnB2_types.sort(),
            fnStatementTokens: fnB2_toks.sort(),
          },
        },
      ],
    },
    {
      prop: 'program.body[2].declarations[0]',
      data: {
        index: -1,
        type: 'fn',
        name: 'fn3',
        loc: {
          start: { line: 11, column: 8 },
          end: { line: 13, column: 1 },
        },
        fnStatementTypes: fnD_types.sort(),
        fnStatementTokens: fnD_toks.sort(),
      },
    },
  ]
  const collapsed: Signature[] = [
    {
      index: 0,
      type: 'fn',
      name: 'b',
      loc: {
        start: { line: 2, column: 8 },
        end: { line: 10, column: 1 },
      },
      fnStatementTypes: fnB_types.sort(),
      fnStatementTokens: fnB_toks.sort(),
    },
    {
      index: 1,
      type: 'fn',
      name: ['b', 'fn1'].reduce(fnNamesConcat),
      loc: {
        start: { line: 3, column: 2 },
        end: { line: 6, column: 3 },
      },
      fnStatementTypes: fnB1_types.sort(),
      fnStatementTokens: fnB1_toks.sort(),
    },
    {
      index: 2,
      type: 'fn',
      name: ['b', 'fn2'].reduce(fnNamesConcat),
      loc: {
        start: { line: 7, column: 3 },
        end: { line: 9, column: 3 },
      },
      fnStatementTypes: fnB2_types.sort(),
      fnStatementTokens: fnB2_toks.sort(),
    },
    {
      index: 3,
      type: 'fn',
      name: 'fn3',
      loc: {
        start: { line: 11, column: 8 },
        end: { line: 13, column: 1 },
      },
      fnStatementTypes: fnD_types.sort(),
      fnStatementTokens: fnD_toks.sort(),
    },
  ]

  const tree = fnOnlyTreeCreator(parse(code))

  t.deepEqual(expected, tree)
  t.deepEqual(collapsed, collapseFnNamesTree(tree))
  t.deepEqual(collapsed, collapseFnNamesTree(expected))
  t.deepEqual(collapsed, (await extractStructure({ content: code })).functionSignature)
})

test('fn filtered correctly with v2 extractor', async t => {
  const fnB1 = stripIndent`
    function fn1() {
      var c = '1';
      return c;
    }
  `
  const fnB1_toks = [
    `${DECLARATION}:Variable[${PARAM}:Identifier[c] = ${LITERAL}:String]`,
    `${STATEMENT}:Return[${EXPRESSION}:Identifier[c]]`,
  ]
  const fnB1_types = [`t_${STATEMENT}:VariableDeclaration`, `t_${STATEMENT}:ReturnStatement`]

  const fnB2 = stripIndent`
    function fn2(param) {
      return param + '2';
    }
  `
  const fnB2_toks = [
    oneLineTrim`
      ${STATEMENT}:Return[
        ${EXPRESSION}:Binary[${EXPRESSION}:Identifier[param] + ${LITERAL}:String]
      ]
    `,
  ]
  const fnB2_types = [`t_${PARAM}:Identifier`, `t_${STATEMENT}:ReturnStatement`]

  const fnB = source`
    function () {
      ${fnB1}
      ${'(' + fnB2 + ')(a);'}
    }
  `
  const fnB_toks = [
    `${DECLARATION}:Function[${EXPRESSION}:Identifier[fn1]]`,
    oneLineTrim`
      ${EXPRESSION}:Call[
        ${EXPRESSION}:Function[${EXPRESSION}:Identifier[fn2]](${EXPRESSION}:Identifier[a])
      ]
    `,
  ]
  const fnB_types = [`t_${STATEMENT}:FunctionDeclaration`, `t_${STATEMENT}:ExpressionStatement`]

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
  const fnD_types = [`t_${STATEMENT}:ReturnStatement`]

  const code = source`
      var a = '1';
      ${`var b = ${fnB};`}
      ${`var d = ${fnD};`}
    `
  const expected: TreePath<Signature>[] = [
    {
      prop: 'program.body[1].declarations[0]',
      data: {
        index: -1,
        type: 'fn',
        name: 'b',
        loc: {
          start: { line: 2, column: 8 },
          end: { line: 10, column: 1 },
        },
        fnStatementTypes: fnB_types.sort(),
        fnStatementTokens: fnB_toks.sort(),
      },
      c: [
        {
          prop: 'program.body[1].declarations[0].init.body.body[0]',
          data: {
            index: -1,
            type: 'fn',
            name: 'fn1',
            loc: {
              start: { line: 3, column: 2 },
              end: { line: 6, column: 3 },
            },
            fnStatementTypes: fnB1_types.sort(),
            fnStatementTokens: fnB1_toks.sort(),
          },
        },
        {
          prop: 'program.body[1].declarations[0].init.body.body[1].expression.callee',
          data: {
            index: -1,
            type: 'fn',
            name: 'fn2',
            loc: {
              start: { line: 7, column: 3 },
              end: { line: 9, column: 3 },
            },
            fnStatementTypes: fnB2_types.sort(),
            fnStatementTokens: fnB2_toks.sort(),
          },
        },
      ],
    },
    {
      prop: 'program.body[2].declarations[0]',
      data: {
        index: -1,
        type: 'fn',
        name: 'fn3',
        loc: {
          start: { line: 11, column: 8 },
          end: { line: 13, column: 1 },
        },
        fnStatementTypes: fnD_types.sort(),
        fnStatementTokens: fnD_toks.sort(),
      },
    },
  ]
  const collapsed: Signature[] = [
    {
      index: 0,
      type: 'fn',
      name: 'b',
      loc: {
        start: { line: 2, column: 8 },
        end: { line: 10, column: 1 },
      },
      fnStatementTypes: fnB_types.sort(),
      fnStatementTokens: fnB_toks.sort(),
    },
    {
      index: 1,
      type: 'fn',
      name: ['b', 'fn1'].reduce(fnNamesConcat),
      loc: {
        start: { line: 3, column: 2 },
        end: { line: 6, column: 3 },
      },
      fnStatementTypes: fnB1_types.sort(),
      fnStatementTokens: fnB1_toks.sort(),
    },
    {
      index: 2,
      type: 'fn',
      name: ['b', 'fn2'].reduce(fnNamesConcat),
      loc: {
        start: { line: 7, column: 3 },
        end: { line: 9, column: 3 },
      },
      fnStatementTypes: fnB2_types.sort(),
      fnStatementTokens: fnB2_toks.sort(),
    },
    {
      index: 3,
      type: 'fn',
      name: 'fn3',
      loc: {
        start: { line: 11, column: 8 },
        end: { line: 13, column: 1 },
      },
      fnStatementTypes: fnD_types.sort(),
      fnStatementTokens: fnD_toks.sort(),
    },
  ]

  const parsed = parse(code)
  const tree = fnOnlyTreeCreator(parsed, { 'extractor-version': EXTRACTOR_VERSION.v2 })

  t.deepEqual(expected, tree)
  t.deepEqual(collapsed, collapseFnNamesTree(tree))
  t.deepEqual(collapsed, collapseFnNamesTree(expected))
  t.deepEqual(
    collapsed,
    (await extractStructure({ content: code, opts: { 'extractor-version': EXTRACTOR_VERSION.v2 } }))
      .functionSignature,
  )
})

test('react-native: bundle filtered correctly', t => {
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
  t.true(isFunction(first.data!.factory as any))
  t.is(second.data!.id, 1)
  t.true(isFunction(second.data!.factory as any))
  t.is(third.data!.id, 2)
  t.true(isFunction(third.data!.factory as any))
  t.is(fourth.data!.id, 3)
  t.true(isFunction(fourth.data!.factory as any))
})

test('literals: extracted needed, skipped common', t => {
  const content = stripIndent`
    function a() {
      var st1 = 'string one';
      var nu1 = 12345;
      var re1 = /re.?e/;
      var te1 = \`template\`;

      function b() {
        var st2 = 'string two';
        var nu2 = 123456;
        var re2 = /er.+e/g;
        var te2 = \`
          template
          template 2
          '\${nu1 + nu2}'
        \`
      }

      var common1 = true;
      var common2 = false;
      var common3 = null;
      var common4 = 0;
      var common5 = 1;
    }
  `
  const sig = literalValues(parse(content))
  t.is(8, sig.length)
})
