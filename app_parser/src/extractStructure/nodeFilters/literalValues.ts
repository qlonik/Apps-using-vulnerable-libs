import {
  isNumericLiteral,
  isRegExpLiteral,
  isStringLiteral,
  isTemplateLiteral,
  Node as BabelNode
} from 'babel-types'
import { stdoutLog } from '../../utils/logger'
import { Signal, Signals, TreePath } from '../visitNodes'


const NAMESPACE = 'nodeFilters:literalValue'
const log = stdoutLog(NAMESPACE)

export type SignatureLiteral = string | number

const stop = (data: SignatureLiteral | null) => {
  return new Signal<SignatureLiteral>(Signals.preventRecursion, data)
}

export const literalValuesFilter = (path: string, node: BabelNode): Signal<SignatureLiteral> => {

  if (isStringLiteral(node)) {
    const val = node.value

    if (val === '') {
      return stop(null)
    }

    return stop(val)
  }
  else if (isNumericLiteral(node)) {
    const val = node.value

    if (val === -1 || val === 0 || val === 1 || val === 2 ||
        val === 3 || val === 4 || val === 5) {

      return stop(null)
    }

    return stop(val)
  }
  else if (isRegExpLiteral(node)) {
    return stop(`/${node.pattern}/${node.flags}`)
  }
  else if (isTemplateLiteral(node)) {
    return stop(node.quasis.map((quasi) => quasi.value.cooked).join('...'))
  }
  else {
    // skipping BooleanLiteral, NullLiteral
    return new Signal<SignatureLiteral>(Signals.continueRecursion, null)
  }
}

export const collapseLiteralValsTree = (
  tree: TreePath<SignatureLiteral>[]): SignatureLiteral[] => {

  return tree
    .map((el) => el.data)
    .sort()
}
