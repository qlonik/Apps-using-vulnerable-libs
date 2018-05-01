import { test } from 'ava'
import { stripIndent } from 'common-tags'
import { EXPRESSION, PARAM, STATEMENT } from '../tags'
import { checkSameSignature, checkThrows, checkTokensMacro } from './_macros'

test(
  'try st;',
  checkThrows,
  stripIndent`
    function a() {
      try b++
    }
  `,
)

test(
  'try {st}',
  checkThrows,
  stripIndent`
    function a() {
      try { b++ }
    }
  `,
)

test(
  'try {st} catch',
  checkThrows,
  stripIndent`
    function a() {
      try { b++ } catch
    }
  `,
)

test(
  'try {st} catch {st}',
  checkThrows,
  stripIndent`
    function a() {
      try { b++ } catch {}
    }
  `,
)

test(
  'try {st} catch ()',
  checkThrows,
  stripIndent`
    function a() {
      try { b++ } catch ()
    }
  `,
)

test(
  'try {st} catch () {}',
  checkThrows,
  stripIndent`
    function a() {
      try { b++ } catch () {}
    }
  `,
)

test(
  'try {st} catch (err)',
  checkThrows,
  stripIndent`
    function a() {
      try { b++ } catch (err)
    }
  `,
)

test(
  'try {st} finally',
  checkThrows,
  stripIndent`
    function a() {
      try { b++ } finally
    }
  `,
)

test(
  'try {st} catch (err) {}',
  checkTokensMacro,
  stripIndent`
    function a() {
      try { b++ } catch (err) {}
    }
  `,
  [
    `${STATEMENT}:Try-Catch[${PARAM}:Identifier[err]]`,
    `${EXPRESSION}:Update[${EXPRESSION}:Identifier[b]++]`,
  ],
)

test(
  'try {st} finally {}',
  checkTokensMacro,
  stripIndent`
    function a() {
      try { b++ } finally {}
    }
  `,
  [`${STATEMENT}:Try-Finally`, `${EXPRESSION}:Update[${EXPRESSION}:Identifier[b]++]`],
)

test(
  'try {st} catch (err) {} finally {}',
  checkTokensMacro,
  stripIndent`
    function a() {
      try { b++ } catch (err) {} finally {}
    }
  `,
  [
    `${STATEMENT}:Try-Catch-Finally[${PARAM}:Identifier[err]]`,
    `${EXPRESSION}:Update[${EXPRESSION}:Identifier[b]++]`,
  ],
)

test(
  'new lines do not matter',
  checkSameSignature,
  stripIndent`
    function a() {
      try { b++ } catch (err) {} finally {}
    }
  `,
  stripIndent`
    function a() {
      try {
        b++
      } catch (err) {
      } finally {
      }
    }
  `,
)
