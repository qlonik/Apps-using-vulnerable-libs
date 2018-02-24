import {
  isNumericLiteral,
  isRegExpLiteral,
  isStringLiteral,
  isTemplateLiteral,
  Node as BabelNode,
} from 'babel-types'
import { stdoutLog } from '../../utils/logger'
import { Signal, TreePath } from '../visitNodes'

const NAMESPACE = 'nodeFilters:literalValue'
const log = stdoutLog(NAMESPACE)

export type SignatureLiteral = string | number

export const literalValuesFilter = (path: string, node: BabelNode): Signal<SignatureLiteral> => {
  if (isStringLiteral(node)) {
    const val = node.value

    if (val === '') {
      return Signal.stop<SignatureLiteral>(null)
    }

    return Signal.stop<SignatureLiteral>(val)
  } else if (isNumericLiteral(node)) {
    const val = node.value

    if (val === -1 || val === 0 || val === 1 || val === 2 || val === 3 || val === 4 || val === 5) {
      return Signal.stop<SignatureLiteral>(null)
    }

    return Signal.stop<SignatureLiteral>(val)
  } else if (isRegExpLiteral(node)) {
    return Signal.stop<SignatureLiteral>(`/${node.pattern}/${node.flags}`)
  } else if (isTemplateLiteral(node)) {
    return Signal.stop<SignatureLiteral>(node.quasis.map((quasi) => quasi.value.cooked).join('...'))
  } else {
    // skipping BooleanLiteral, NullLiteral
    return Signal.continue<SignatureLiteral>(null)
  }
}

export const collapseLiteralValsTree = (tree: TreePath<SignatureLiteral>[]): SignatureLiteral[] => {
  return tree.map((el) => el.data).sort()
}
