import test from 'ava'
import execa from 'execa'
import { readdir } from 'fs-extra'
import { stripIllegalNames } from './_strip-illegal-names'

const CLI_SCRIPT = __dirname
const FIXTURES = 'fixtures'
const EXPORT_MAIN_FN = `${FIXTURES}/export-main-fn`
const NO_EXPORT_MAIN_FN = `${FIXTURES}/no-export-main-fn`

test.skip('lists bin scripts correctly', async t => {
  const currentDirContent = await readdir(__dirname)
  const expected = stripIllegalNames(currentDirContent)

  const result = await execa('node', ['--no-warnings', CLI_SCRIPT, 'list'])
  const scripts = JSON.parse(
    '[' +
      result.stdout
        .split('\n')
        .slice(2, -1)
        .join('\n') +
      ']',
  )

  t.deepEqual(expected, scripts)
})

test.skip('bin scripts in dirs fail', async t => {
  const { FD, OUT } = process.env
  const error = await t.throws(
    execa('node', ['--no-warnings', CLI_SCRIPT, EXPORT_MAIN_FN], {
      extendEnv: false,
      env: { OUT, FD },
    }),
  )
  t.true(error.message.includes('illegal bin script'))
})

test.skip("bin scripts in dirs don't fail when in test mode", async t => {
  const { FD, OUT, NODE_ENV } = process.env
  const noError = await execa('node', ['--no-warnings', CLI_SCRIPT, EXPORT_MAIN_FN], {
    extendEnv: false,
    env: { OUT, FD, NODE_ENV },
  })
  t.truthy(noError.stdout)
  t.falsy(noError.stderr)
})

test.skip('runs script which exports main function', async t => {
  const result = await execa('node', ['--no-warnings', CLI_SCRIPT, EXPORT_MAIN_FN])

  t.is(
    'hello',
    result.stdout
      .split('\n')
      .slice(1, 2)
      .map(v => v.trim())
      .join('\n'),
  )
})

test.skip('does not run script which does not export main function', async t => {
  const error = await t.throws(execa('node', ['--no-warnings', CLI_SCRIPT, NO_EXPORT_MAIN_FN]))
  t.true(error.message.includes('no main exported'))
  t.true(error.message.includes('TypeError'))
})
