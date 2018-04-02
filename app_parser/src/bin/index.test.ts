import { test } from 'ava'
import execa from 'execa'
import { readdir } from 'fs-extra'
import { chain } from 'lodash'
import { stripIllegalNames } from './_strip-illegal-names'

const CLI_SCRIPT = __dirname
const FIXTURES = 'fixtures'
const EXPORT_MAIN_FN = `${FIXTURES}/export-main-fn`
const NO_EXPORT_MAIN_FN = `${FIXTURES}/no-export-main-fn`

test('lists bin scripts correctly', async t => {
  const currentDirContent = await readdir(__dirname)
  const expected = stripIllegalNames(currentDirContent)

  const result = await execa('node', [CLI_SCRIPT, 'list'], { env: { DEBUG_COLORS: 'false' } })
  const scripts = chain(result.stdout)
    .split('\n')
    .drop()
    .map(v => v.trim())
    .value()

  t.deepEqual(expected, scripts)
})

test('bin scripts in dirs fail', async t => {
  const error = await t.throws(
    execa('node', [CLI_SCRIPT, EXPORT_MAIN_FN], {
      extendEnv: false,
      env: { DEBUG_COLORS: 'false' },
    }),
  )
  t.true(error.message.includes('illegal bin script'))
})

test("bin scripts in dirs don't fail when in test mode", async t => {
  const noError = await execa('node', [CLI_SCRIPT, EXPORT_MAIN_FN], {
    extendEnv: false,
    env: { DEBUG_COLORS: 'false', NODE_ENV: process.env.NODE_ENV },
  })
  t.truthy(noError.stdout)
  t.falsy(noError.stderr)
})

test('runs script which exports main function', async t => {
  const result = await execa('node', [CLI_SCRIPT, EXPORT_MAIN_FN], {
    env: { DEBUG_COLORS: 'false' },
  })

  t.is('hello', result.stdout)
})

test('runs script which does not export main function', async t => {
  const result = await execa('node', [CLI_SCRIPT, NO_EXPORT_MAIN_FN], {
    env: { DEBUG_COLORS: 'false' },
  })

  t.is('hello', result.stdout)
})
