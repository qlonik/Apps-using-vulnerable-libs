import test from 'ava'
import { stripIndent } from 'common-tags'
import { extractStructure, fnNamesConcat, parseRNBundle, rnSignature } from './index'
import { DECLARATION, EXPRESSION, LITERAL, STATEMENT } from './tags'


test('number of functions is correct', async t => {
  const content = stripIndent`
    function a() {
      var b = function c() {}
      var d = function () {}
      var e = () => {}
    }

    a(function f() {})
    a(function () {})
    a(() => {})

    (function g() {})()
    (function () {})()
    (() => {})()
  `
  const structure = await extractStructure({ content })

  t.is(10, structure.length)
})

test('names are correct', async t => {
  const content = stripIndent`
    var fa = function a() {
      var b = function () {
        function c() {}
      }
    }
  `
  const structure = await extractStructure({ content })
  const names = structure.map(f => f.name)

  const firstFnName = 'a'
  const secondFnName = fnNamesConcat(firstFnName, 'b')
  const thirdFnName = fnNamesConcat(secondFnName, 'c')
  const expectedNames = [firstFnName, secondFnName, thirdFnName]

  t.deepEqual(expectedNames, names)
})

test('react-native: signature created is correct', async t => {
  const content = stripIndent`
    !function a() {}(this)
    !function b() {}(this)
    !function c() {}(this)
    __d('0', [], function () {
      function a() {
        function b() {}
      };
      function c() {};
      return 123;
    })
    __d(1, function () {
      var a = function () {
        var b = function fn() {
          return 123;
        }
      };
      return 234;
    })
    __d(function () {
      return 345;
    }, 2)
    __d(function () {
      return 456;
    }, 3, [])
  `
  const expected: rnSignature[] = [
    {
      id: '0',
      structure: [{
        type: 'fn',
        name: 'a',
        fnStatementTypes: [
          `t_${STATEMENT}:FunctionDeclaration`,
        ],
        fnStatementTokens: [
          `${DECLARATION}:Function[${EXPRESSION}:Identifier[b]]`
        ],
      }, {
        type: 'fn',
        name: fnNamesConcat('a', 'b'),
        fnStatementTypes: [],
        fnStatementTokens: [],
      }, {
        type: 'fn',
        name: 'c',
        fnStatementTypes: [],
        fnStatementTokens: [],
      }],
    },
    {
      id: 1,
      structure: [{
        type: 'fn',
        name: 'a',
        fnStatementTypes: [
          `t_${STATEMENT}:VariableDeclaration`,
        ],
        fnStatementTokens: [
          `${DECLARATION}:Variable[b = ${EXPRESSION}:Function[${EXPRESSION}:Identifier[fn]]]`,
        ],
      }, {
        type: 'fn',
        name: fnNamesConcat('a', 'fn'),
        fnStatementTypes: [
          `t_${STATEMENT}:ReturnStatement`,
        ],
        fnStatementTokens: [
          `${STATEMENT}:Return[${LITERAL}:Numeric]`,
        ],
      }],
    },
    {
      id: 2,
      structure: [],
    },
    {
      id: 3,
      structure: [],
    },
  ]

  t.deepEqual(expected, await parseRNBundle({ content }))
})
