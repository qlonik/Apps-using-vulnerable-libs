import { test } from 'ava'
import { isFunction, SourceLocation } from 'babel-types'
import { parse } from 'babylon'
import { oneLineTrim, source, stripIndent } from 'common-tags'
import { assertNever } from '../utils'
import { fnNamesConcat } from './fn-names-concat'
import { extractStructure } from './index'
import { collapseFnNamesTree, fnOnlyTreeCreator, literalValues, rnDeclareFns } from './internal'
import { Signature } from './nodeFilters/allFnsAndNames'
import { EXTRACTOR_VERSION as EV, getDefaultOpts, opts } from './options'
import { DECLARATION, EXPRESSION, LITERAL, PARAM, STATEMENT } from './tags'
import { TreePath } from './visit-nodes'

/**
 * @param l String in format: "<sl>:<sc>-<el>:<ec>", where sl, sc, el, and ec are location numbers
 */
const tLoc = (l: string): SourceLocation => {
  const [[sLine, sCol], [eLine, eCol]] = l.split('-').map(l => l.split(':').map(i => parseInt(i)))
  return { start: { line: sLine, column: sCol }, end: { line: eLine, column: eCol } }
}

const getCode = ({ 'extractor-version': V }: opts) => {
  const fnB1 = stripIndent`
    function fn1() {
      var c = '1';
      return c;
    }
  `
  const fnB2 = stripIndent`
    function fn2(param) {
      return param + '2';
    }
  `
  const fnB = source`
    function () {
      ${fnB1}
      ${'(' + fnB2 + ')(a);'}
    }
  `
  const fnD = stripIndent`
    function fn3() {
      return 1 + 2 + 3;
    }
  `
  const code = source`
    var a = '1';
    ${`var b = ${fnB};`}
    ${`var d = ${fnD};`}
  `

  const fnB1_toks =
    V === EV.v1 || V === EV.v2
      ? [
          `${DECLARATION}:Variable[${PARAM}:Identifier[c] = ${LITERAL}:String]`,
          `${STATEMENT}:Return[${EXPRESSION}:Identifier[c]]`,
        ]
      : assertNever(V)
  const fnB1_types = [`t_${STATEMENT}:VariableDeclaration`, `t_${STATEMENT}:ReturnStatement`]
  const fnB1_loc = tLoc('3:2-6:3')

  const fnB2_toks = (V === EV.v1
    ? [`${PARAM}:Identifier[param]`]
    : V === EV.v2 ? [] : assertNever(V)
  ).concat([
    oneLineTrim`
      ${STATEMENT}:Return[
        ${EXPRESSION}:Binary[${EXPRESSION}:Identifier[param] + ${LITERAL}:String]
      ]
    `,
  ])
  const fnB2_types = [`t_${PARAM}:Identifier`, `t_${STATEMENT}:ReturnStatement`]
  const fnB2_loc = tLoc('7:3-9:3')

  const fnB_toks =
    V === EV.v1 || V === EV.v2
      ? [
          `${DECLARATION}:Function[${EXPRESSION}:Identifier[fn1]]`,
          oneLineTrim`
            ${EXPRESSION}:Call[
              ${EXPRESSION}:Function[${EXPRESSION}:Identifier[fn2]](${EXPRESSION}:Identifier[a])
            ]
          `,
        ]
      : assertNever(V)
  const fnB_types = [`t_${STATEMENT}:FunctionDeclaration`, `t_${STATEMENT}:ExpressionStatement`]
  const fnB_loc = tLoc('2:8-10:1')

  const fnD_toks =
    V === EV.v1 || V === EV.v2
      ? [
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
      : assertNever(V)
  const fnD_types = [`t_${STATEMENT}:ReturnStatement`]
  const fnD_loc = tLoc('11:8-13:1')

  const treePath: TreePath<Signature>[] = [
    {
      prop: 'program.body[1].declarations[0]',
      data: {
        index: -1,
        type: 'fn',
        name: 'b',
        loc: fnB_loc,
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
            loc: fnB1_loc,
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
            loc: fnB2_loc,
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
        loc: fnD_loc,
        fnStatementTypes: fnD_types.sort(),
        fnStatementTokens: fnD_toks.sort(),
      },
    },
  ]
  const signature: Signature[] = [
    {
      index: 0,
      type: 'fn',
      name: 'b',
      loc: fnB_loc,
      fnStatementTypes: fnB_types.sort(),
      fnStatementTokens: fnB_toks.sort(),
    },
    {
      index: 1,
      type: 'fn',
      name: ['b', 'fn1'].reduce(fnNamesConcat),
      loc: fnB1_loc,
      fnStatementTypes: fnB1_types.sort(),
      fnStatementTokens: fnB1_toks.sort(),
    },
    {
      index: 2,
      type: 'fn',
      name: ['b', 'fn2'].reduce(fnNamesConcat),
      loc: fnB2_loc,
      fnStatementTypes: fnB2_types.sort(),
      fnStatementTokens: fnB2_toks.sort(),
    },
    {
      index: 3,
      type: 'fn',
      name: 'fn3',
      loc: fnD_loc,
      fnStatementTypes: fnD_types.sort(),
      fnStatementTokens: fnD_toks.sort(),
    },
  ]

  return { code, treePath, signature }
}

test('fn filtered correctly', async t => {
  const opts = getDefaultOpts()
  const { code, treePath: expected, signature: collapsed } = getCode(opts)
  const tree = fnOnlyTreeCreator(parse(code), opts)

  t.deepEqual(expected, tree)
  t.deepEqual(collapsed, collapseFnNamesTree(tree))
  t.deepEqual(collapsed, collapseFnNamesTree(expected))
  t.deepEqual(collapsed, (await extractStructure({ content: code })).functionSignature)
})

test('fn filtered correctly with v2 extractor', async t => {
  const opts = getDefaultOpts({ 'extractor-version': EV.v2 })
  const { code, treePath: expected, signature: collapsed } = getCode(opts)
  const tree = fnOnlyTreeCreator(parse(code), opts)

  t.deepEqual(expected, tree)
  t.deepEqual(collapsed, collapseFnNamesTree(tree))
  t.deepEqual(collapsed, collapseFnNamesTree(expected))
  t.deepEqual(
    collapsed,
    (await extractStructure({ content: code, options: opts })).functionSignature,
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
  const [first, second, third, fourth] = rnDeclareFns(parse(content), getDefaultOpts())

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
  const sig = literalValues(parse(content), getDefaultOpts())
  t.is(8, sig.length)
})
