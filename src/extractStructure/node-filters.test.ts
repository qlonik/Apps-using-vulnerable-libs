import test from 'ava'
import { isFunction, SourceLocation } from 'babel-types'
import { parse } from 'babylon'
import { oneLineTrim, source, stripIndent } from 'common-tags'
import { assertNever } from '../utils'
import { fnNamesConcat } from './fn-names-concat'
import { extractStructure } from './index'
import { collapseFnNamesTree, fnOnlyTreeCreator, literalValues, rnDeclareFns } from './internal'
import { Signature } from './node-filters/all-fns-and-names'
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
  const fnE = stripIndent`
    function fn5(param2) {
    }
  `
  const fnF1 = stripIndent`
    function () {
      var g = 1;
      return g + 2;
    }
  `
  const fnF = stripIndent`
    function fn6(param3) {
      ${`return ${fnF1};`}
    }
  `
  const code = source`
    var a = '1';
    ${`var b = ${fnB};`}
    ${`var d = ${fnD};`}
    ${`var e = ${fnE};`}
    ${`var f = ${fnF};`}
  `

  // region fnB1 data
  const fnB1_toks =
    V === EV.v1 || V === EV.v2 || V === EV.v3
      ? [
          `${DECLARATION}:Variable[${PARAM}:Identifier[c] = ${LITERAL}:String]`,
          `${STATEMENT}:Return[${EXPRESSION}:Identifier[c]]`,
        ]
      : assertNever(V)
  const fnB1_types = [`t_${STATEMENT}:VariableDeclaration`, `t_${STATEMENT}:ReturnStatement`]
  const fnB1_loc = tLoc('3:2-6:3')
  // endregion
  // region fnB2 data
  const fnB2_toks = (V === EV.v1
    ? [`${PARAM}:Identifier[param]`]
    : V === EV.v2 || V === EV.v3 ? [] : assertNever(V)
  ).concat([
    oneLineTrim`
      ${STATEMENT}:Return[
        ${EXPRESSION}:Binary[${EXPRESSION}:Identifier[param] + ${LITERAL}:String]
      ]
    `,
  ])
  const fnB2_types = [`t_${PARAM}:Identifier`, `t_${STATEMENT}:ReturnStatement`]
  const fnB2_loc = tLoc('7:3-9:3')
  // endregion
  // region fnB data
  const fnB_toks =
    V === EV.v1 || V === EV.v2 || V === EV.v3
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
  // endregion
  // region fnD data
  const fnD_toks =
    V === EV.v1 || V === EV.v2 || V === EV.v3
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
  // endregion
  // region fnE data
  const fnE_toks =
    V === EV.v1
      ? [`${PARAM}:Identifier[param2]`]
      : V === EV.v2 || V === EV.v3 ? ([] as string[]) : assertNever(V)
  const fnE_types = [`t_${PARAM}:Identifier`]
  const fnE_loc = tLoc('14:8-15:1')
  // endregion
  // region fnF1 data
  const fnF1_toks =
    V === EV.v1 || V === EV.v2 || V === EV.v3
      ? [
          `${DECLARATION}:Variable[${PARAM}:Identifier[g] = ${LITERAL}:Numeric]`,
          oneLineTrim`
            ${STATEMENT}:Return[
              ${EXPRESSION}:Binary[${EXPRESSION}:Identifier[g] + ${LITERAL}:Numeric]
            ]
          `,
        ]
      : assertNever(V)
  const fnF1_types = [`t_${STATEMENT}:VariableDeclaration`, `t_${STATEMENT}:ReturnStatement`]
  const fnF1_loc = tLoc('17:13-20:1')
  // endregion
  // region fnF data
  const fnF_toks = (V === EV.v1
    ? [`${PARAM}:Identifier[param3]`]
    : V === EV.v2 || V === EV.v3 ? [] : assertNever(V)
  ).concat([`${STATEMENT}:Return[${EXPRESSION}:Function[anonymous]]`])
  const fnF_types = [`t_${PARAM}:Identifier`, `t_${STATEMENT}:ReturnStatement`]
  const fnF_loc = tLoc('16:8-21:5')
  // endregion

  const type = 'fn' as 'fn'
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
    {
      prop: 'program.body[3].declarations[0]',
      data: {
        index: -1,
        type: 'fn',
        name: 'fn5',
        loc: fnE_loc,
        fnStatementTypes: fnE_types.sort(),
        fnStatementTokens: fnE_toks.sort(),
      },
    },
    {
      prop: 'program.body[4].declarations[0]',
      data: {
        index: -1,
        type: 'fn',
        name: 'fn6',
        loc: fnF_loc,
        fnStatementTypes: fnF_types.sort(),
        fnStatementTokens: fnF_toks.sort(),
      },
      c: [
        {
          prop: 'program.body[4].declarations[0].init.body.body[0]',
          data: {
            index: -1,
            type: 'fn',
            name: '[anonymous]',
            loc: fnF1_loc,
            fnStatementTypes: fnF1_types.sort(),
            fnStatementTokens: fnF1_toks.sort(),
          },
        },
      ],
    },
  ]
  const signature: Signature[] = [
    {
      index: 0,
      type,
      name: 'b',
      loc: fnB_loc,
      fnStatementTypes: fnB_types.sort(),
      fnStatementTokens: fnB_toks.sort(),
    },
    {
      index: 1,
      type,
      name: ['b', 'fn1'].reduce(fnNamesConcat),
      loc: fnB1_loc,
      fnStatementTypes: fnB1_types.sort(),
      fnStatementTokens: fnB1_toks.sort(),
    },
    {
      index: 2,
      type,
      name: ['b', 'fn2'].reduce(fnNamesConcat),
      loc: fnB2_loc,
      fnStatementTypes: fnB2_types.sort(),
      fnStatementTokens: fnB2_toks.sort(),
    },
    {
      index: 3,
      type,
      name: 'fn3',
      loc: fnD_loc,
      fnStatementTypes: fnD_types.sort(),
      fnStatementTokens: fnD_toks.sort(),
    },
    V === EV.v1 || V === EV.v2
      ? {
          index: 4,
          type,
          name: 'fn5',
          loc: fnE_loc,
          fnStatementTypes: fnE_types.sort(),
          fnStatementTokens: fnE_toks.sort(),
        }
      : V === EV.v3 ? null : assertNever(V),
    V === EV.v1 || V === EV.v2
      ? {
          index: 5,
          type,
          name: 'fn6',
          loc: fnF_loc,
          fnStatementTypes: fnF_types.sort(),
          fnStatementTokens: fnF_toks.sort(),
        }
      : V === EV.v3 ? null : assertNever(V),
    {
      index: 6,
      type,
      name: ['fn6', '[anonymous]'].reduce(fnNamesConcat),
      loc: fnF1_loc,
      fnStatementTypes: fnF1_types.sort(),
      fnStatementTokens: fnF1_toks.sort(),
    },
  ].filter((o): o is NonNullable<typeof o> => o !== null && o !== undefined)

  return { code, treePath, signature }
}

const EVs = Object.values(EV).filter(n => typeof n === 'string') as (keyof typeof EV)[]
for (let V of EVs) {
  test(`extractor ${V}: fn filtered correctly`, async t => {
    const opts = getDefaultOpts({ 'extractor-version': EV[V] })
    const { code, treePath: expected, signature: collapsed } = getCode(opts)
    const tree = fnOnlyTreeCreator(parse(code), opts)

    t.deepEqual(expected, tree)
    t.deepEqual(collapsed, collapseFnNamesTree(tree, opts))
    t.deepEqual(collapsed, collapseFnNamesTree(expected, opts))
    t.deepEqual(
      collapsed,
      (await extractStructure({ content: code, options: opts })).functionSignature,
    )
  })
}

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
