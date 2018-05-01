import { ExecutionContext, Macro } from 'ava'
import { isFunction } from 'babel-types'
import { parse } from 'babylon'
import { extractStructure } from '../index'
import { getFnStatementTokens } from './index'

export const checkTokensMacro: Macro = async (
  t: ExecutionContext,
  content: string = '',
  expected: string[] = [],
) => {
  t.truthy(content, 'Script content is empty')

  let parsed
  try {
    parsed = parse(content)
  } catch (err) {
    return t.fail(`Parsing error: ${err.message}`)
  }

  const msg = 'Script has to contain only one function'
  const body = parsed.program.body
  t.is(1, body.length, msg)
  const fn = body[0]
  t.true(isFunction(fn), msg)
  t.deepEqual(expected.sort(), getFnStatementTokens(fn))

  // add exception for 'empty' test case
  if (t.title !== 'empty block' && t.title !== 'empty function' && expected.length === 0) {
    t.fail('Expected array is empty. Test case is most likely missing.')
  }
}

export const checkSameSignature: Macro = async (t: ExecutionContext, one: string, two: string) => {
  t.truthy(one, 'First script is empty')
  t.truthy(two, 'Second script is empty')

  const [oneS, twoS] = await Promise.all([
    extractStructure({ content: one }),
    extractStructure({ content: two }),
  ])
  const oneFirstFn = oneS.functionSignature[0].fnStatementTokens
  const twoFirstFn = twoS.functionSignature[0].fnStatementTokens

  t.true(Array.isArray(oneFirstFn))
  t.true(Array.isArray(twoFirstFn))
  t.deepEqual(oneFirstFn, twoFirstFn)
}

export const checkThrows: Macro = async (t: ExecutionContext, content: string) => {
  await t.throws(extractStructure({ content }), { name: 'SyntaxError' })
}
