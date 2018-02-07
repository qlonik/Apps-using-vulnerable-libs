import test from 'ava'
import { stripIndent } from 'common-tags'
import {
  extractFunctionStructure,
  extractLiteralStructure,
  extractReactNativeStructure,
  extractStructure,
  fnNamesConcat,
  parseRNBundle,
  rnSignature,
  rnSignatureNew,
} from './index'
import { DECLARATION, EXPRESSION, LITERAL, STATEMENT } from './tags'


test('library: extracted correct signature', async t => {
  const content = stripIndent`
    function a() {
      var st1 = 'string one';
      var nu1 = 12345;
      var re1 = /re.?e/;
      var te1 = \`template\`;

      var b = function c() {
        var st2 = 'string two';
        var nu2 = 123456;
        var re2 = /er.+e/g;
        var te2 = \`
          template
          template 2
          '\${nu1 + nu2}'
        \`
      }
      
      var d = function () {}
      var e = () => {}

      var common1 = true;
      var common2 = false;
      var common3 = null;
      var common4 = 0;
      var common5 = 1;
    }
    
    a(function f() {})
    a(function () {})
    a(() => {})

    (function g() {})()
    (function () {})()
    (() => {})()
  `
  const signature = (await extractStructure({ content }))!
  t.true(signature !== null)

  const { functionSignature, literalSignature } = signature
  t.true(Array.isArray(functionSignature))
  t.true(Array.isArray(literalSignature))

  // remark: change to 10 when arrow functions are supported
  t.is(8, functionSignature.length, 'check compatibility with array functions')
  const expectedNames = [
    'a',
    fnNamesConcat('a', 'c'),
    fnNamesConcat('a', 'd'),
    fnNamesConcat('a', 'e'),
    'f',
    '[anonymous]',
    // remark: uncomment when arrow functions are supported
    // '[anonymous]',
    'g',
    '[anonymous]',
    // remark: uncomment when arrow functions are supported
    // '[anonymous]',
  ].sort()
  t.deepEqual(expectedNames, functionSignature.map(({ name }) => name).sort())

  const expectedLiterals = [
    'string one',
    12345,
    '/re.?e/',
    `template`,
    'string two',
    123456,
    '/er.+e/g',
    `
      template
      template 2
      '...'
    `
  ].sort()
  t.deepEqual(expectedLiterals, literalSignature)
})

test('react-native: extracted correct signature', async t => {
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
  const structure = (await extractReactNativeStructure({ content }))!
  t.true(structure !== null)

  const expected: rnSignatureNew[] = [
    {
      id: '0',
      functionSignature: [{
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
      literalSignature: [
        123,
      ],
    },
    {
      id: 1,
      functionSignature: [{
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
      literalSignature: [
        123,
        234,
      ],
    },
    {
      id: 2,
      functionSignature: [],
      literalSignature: [
        345,
      ],
    },
    {
      id: 3,
      functionSignature: [],
      literalSignature: [
        456,
      ],
    },
  ]
  t.deepEqual(expected, structure)
})

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
  const structure = await extractFunctionStructure({ content })

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
  const structure = await extractFunctionStructure({ content })
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

test('literals: signature created is correct', async t => {
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
  const sig = await extractLiteralStructure({ content })
  const expectedVals = [
    'string one',
    12345,
    '/re.?e/',
    `template`,
    'string two',
    123456,
    '/er.+e/g',
    `
      template
      template 2
      '...'
    `
  ].sort()

  t.deepEqual(expectedVals, sig)
})
