import { Comment as BabelComment, CommentBlock, CommentLine, Node as BabelNode } from 'babel-types'
import { parse } from 'babylon'
import { collapseFnNamesTree, fnOnlyTreeCreator, literalValues, rnDeclareFns } from './internal'
import { collapseLiteralValsTree } from './nodeFilters/literalValues'
import { opts } from './options'
import { rnSignatureNew, signatureNew, signatureWithComments } from './types'

export * from './types'
export * from './fn-names-concat'
export { opts }

const mapBabelComments = (
  comment: BabelComment | CommentBlock | CommentLine,
): string | string[] => {
  return 'type' in comment && comment.type === 'CommentBlock'
    ? comment.value.split('\n')
    : comment.value
}

const _extractStructure = function({
  content,
  opts = {},
}: {
  content: BabelNode
  opts?: opts
}): signatureNew {
  const functionSignature = collapseFnNamesTree(fnOnlyTreeCreator(content, opts))
  const literalSignature = collapseLiteralValsTree(literalValues(content, opts))

  return { functionSignature, literalSignature }
}

/**
 * @throws if parsing is unsuccessful
 */
export const extractStructure = async function({
  content,
  opts = {},
}: {
  content: string
  opts?: opts
}): Promise<signatureWithComments> {
  const { program, comments } = parse(content)
  const signature = _extractStructure({ content: program, opts })

  return { ...signature, comments: comments.map(mapBabelComments) }
}

export const extractReactNativeStructure = async function({
  content,
  opts = {},
}: {
  content: string
  opts?: opts
}): Promise<rnSignatureNew[]> {
  const { program } = parse(content)
  return rnDeclareFns(program).map(({ data }) => {
    const { id, factory } = data
    const structure = _extractStructure({ content: factory, opts })
    return { id, ...structure }
  })
}
