import {
  isArrayExpression,
  isCallExpression,
  isFunction,
  isIdentifier,
  isNumericLiteral,
  isObjectExpression,
  isStringLiteral,
  Node as BabelNode,
} from 'babel-types'
import { stdoutLog } from '../../utils/logger'
import { Signal } from '../visit-nodes'

const log = stdoutLog('extractStructure:nodeFilters:rnDeclareFn')

type rnFactory = {
  id: number | string
  factory: BabelNode
}

export const rnDeclareFnFilter = (path: string, node: BabelNode): Signal<rnFactory> => {
  if (!isCallExpression(node)) {
    return Signal.continue<rnFactory>(null)
  }

  const callee = node.callee
  const args = node.arguments

  if (!isIdentifier(callee) || callee.name !== '__d') {
    return Signal.continue<rnFactory>(null)
  }

  // remark: args changed few times in react-native module system implementation
  // at least three are known now: (from oldest to newest)
  //    1. first = ID (String);
  //       second = dependencies (Array);
  //       third = factory (Object|Function);
  //       ... few more params which are used as variables or private params
  //    2. first = ID (Number);
  //       second = factory (FactoryFn);
  //          FactoryFn: (
  //              global: Object,
  //              require: RequireFn,
  //              moduleObject: {exports: {}},
  //              exports: {}
  //          ) => void
  //    3. first = factory (FactoryFn);
  //          FactoryFn: (
  //              global: Object,
  //              require: RequireFn,
  //              moduleObject: {exports: {}},
  //              exports: {},
  //              dependencyMap: Array
  //          ) => void
  //       second = ID (Number);
  //       third = dependencyMap (Array);
  const [first, second, third] = args

  if (
    isStringLiteral(first) &&
    isArrayExpression(second) &&
    (isObjectExpression(third) || isFunction(third))
  ) {
    return Signal.stop<rnFactory>({
      id: first.value,
      factory: third,
    })
  } else if (isNumericLiteral(first) && isFunction(second) && third === undefined) {
    return Signal.stop<rnFactory>({
      id: first.value,
      factory: second,
    })
  } else if (
    isFunction(first) &&
    isNumericLiteral(second) &&
    (isArrayExpression(third) || third === undefined)
  ) {
    return Signal.stop<rnFactory>({
      id: second.value,
      factory: first,
    })
  } else {
    log('UNKNOWN CONFIGURATION PASSED TO __d!!! INVESTIGATE!!!')
    return Signal.stop<rnFactory>(null)
  }
}
