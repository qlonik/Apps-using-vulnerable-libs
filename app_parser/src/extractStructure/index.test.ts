import test from 'ava'
import { stripIndent } from 'common-tags'
import { extractStructure, fnNamesConcat } from './index'


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
