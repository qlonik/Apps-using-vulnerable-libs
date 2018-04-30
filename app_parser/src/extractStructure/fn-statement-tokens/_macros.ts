import { ExecutionContext, Macro } from 'ava'
import { isPlainObject } from 'lodash'
import { extractStructure } from '../index'

export const checkTokensMacro: Macro = async (
  t: ExecutionContext,
  content: string,
  expected: string[],
) => {
  t.truthy(content, 'Script content is empty')

  const structure = await extractStructure({ content })
  const [firstFn] = structure.functionSignature

  t.true(isPlainObject(firstFn))
  t.deepEqual(expected.sort(), firstFn.fnStatementTokens)

  // add exception for 'empty' test case
  if (t.title !== 'empty block' && t.title !== 'empty function' && expected.length === 0) {
    t.fail('Expected array is empty. Test case is most likely missing.')
  }
}

export const checkThrows: Macro = async (t: ExecutionContext, content: string) => {
  await t.throws(extractStructure({ content }), { name: 'SyntaxError' })
}
