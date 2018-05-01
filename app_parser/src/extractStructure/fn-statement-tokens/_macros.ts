import { ExecutionContext, Macro } from 'ava'
import { isFunction } from 'babel-types'
import { parse } from 'babylon'
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

  const oneP = parseContent(t, one, 'Parsing error (script #1)')
  if (!oneP) return
  const twoP = parseContent(t, two, 'Parsing error (script #2)')
  if (!twoP) return

  const oneT = extractTokens(t, oneP, 'Script #1 has to contain only one function')
  if (!oneT) return
  const twoT = extractTokens(t, twoP, 'Script #2 has to contain only one function')
  if (!twoT) return

  t.deepEqual(oneT, twoT)
}

export const checkThrows: Macro = async (t: ExecutionContext, content: string) => {
  t.throws(() => parse(content), { name: 'SyntaxError' })
}
