import { ExecutionContext, Macro } from 'ava'
import { isFunction } from 'babel-types'
import { parse } from 'babylon'
import { extractStructure } from '../index'
import { getFnStatementTokens } from './index'

const parseContent = (
  t: ExecutionContext,
  content: string,
  msg = 'Parsing error',
): false | ReturnType<typeof parse> => {
  let parsed
  try {
    parsed = parse(content)
  } catch (err) {
    t.fail(`${msg}: ${err.message}`)
    return false
  }
  return parsed
}

const extractTokens = (
  t: ExecutionContext,
  parsed: ReturnType<typeof parse>,
  msg = 'Script has to contain only one function',
): false | ReturnType<typeof getFnStatementTokens> => {
  const body = parsed.program.body
  if (body.length !== 1) {
    t.fail(msg)
    return false
  }
  const fn = body[0]
  if (!isFunction(fn)) {
    t.fail(msg)
    return false
  }
  return getFnStatementTokens(fn)
}

export const checkTokensMacro: Macro = async (
  t: ExecutionContext,
  content: string = '',
  expected: string[] = [],
) => {
  t.truthy(content, 'Script content is empty')

  const parsed = parseContent(t, content)
  if (!parsed) return

  const tokens = extractTokens(t, parsed)
  if (!tokens) return
  t.deepEqual(expected.sort(), tokens)

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
