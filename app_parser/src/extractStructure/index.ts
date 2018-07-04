import { Node as BabelNode } from 'babel-types'
import { parse } from 'babylon'
import { collapseFnNamesTree, fnOnlyTreeCreator, literalValues, rnDeclareFns } from './internal'
import { collapseLiteralValsTree } from './nodeFilters/literalValues'
import { getDefaultOpts, opts } from './options'
import { rnSignatureNew, signatureNew, signatureWithComments } from './types'

export * from './types'
export * from './fn-names-concat'
export { opts }

const _extractStructure = function({
  content,
  opts,
}: {
  content: BabelNode
  opts: opts
}): signatureNew {
  // remark: passing opts twice to different fns
  // see for another way of passing opts to fns
  const functionSignature = collapseFnNamesTree(fnOnlyTreeCreator(content, opts), opts)
  const literalSignature = collapseLiteralValsTree(literalValues(content, opts))

  return { functionSignature, literalSignature }
}

/**
 * @throws if parsing is unsuccessful
 */
export const extractStructure = async function({
  content,
  options,
}: {
  content: string
  options?: Partial<opts>
}): Promise<signatureWithComments> {
  const opts = getDefaultOpts(options)

  const { program, comments } = parse(content)
  const signature = _extractStructure({ content: program, opts })

  return { ...signature, comments: comments.map((comment) => comment.value) }
}

export const extractReactNativeStructure = async function({
  content,
  options,
}: {
  content: string
  options?: Partial<opts>
}): Promise<rnSignatureNew[]> {
  const opts = getDefaultOpts(options)

  const { program } = parse(content)
  return rnDeclareFns(program, opts).map(({ data }) => {
    const { id, factory } = data
    const structure = _extractStructure({ content: factory, opts })
    return { id, ...structure }
  })
}
