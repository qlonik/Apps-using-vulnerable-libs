import { Node as BabelNode } from 'babel-types'
import { flatMap } from 'lodash'
import { assertNever } from '../utils'
import { opts } from './'

/**
 * @param prop - property name
 * @param data - custom data
 * @param node - node of the AST
 * @param c - children
 */
export type TreePath<T> = {
  prop: string
  data: T
  node?: BabelNode
  c?: TreePath<T>[]
}

export enum Signals {
  preventRecursion = 'prevent-recursion',
  continueRecursion = 'continue-recursion',
}

export class Signal<T> {
  private __signal: Signals
  private __data: T | null

  private constructor(s: Signals, d: T | null) {
    this.__signal = s
    this.__data = d
  }

  public get signal() {
    return this.__signal
  }

  public get data() {
    return this.__data
  }

  public static continue<T>(data: T | null) {
    return new Signal<T>(Signals.continueRecursion, data)
  }

  public static stop<T>(data: T | null) {
    return new Signal<T>(Signals.preventRecursion, data)
  }
}

const pathConcat = (p: string, c: string | number): string => {
  return p.concat(typeof c === 'number' ? `[${c}]` : p.length ? '.' + c : c)
}

export const visitNodes = <K>({
  fn = undefined,
}: {
  fn?: (path: string, val: any, opts: opts) => Signal<K>
} = {}) => {
  return function paths(
    obj: object | Array<any>,
    opts: opts,
    pathSoFar: string = '',
  ): TreePath<K>[] {
    let entries: Array<[string | number, any]> = []
    if (Array.isArray(obj)) {
      entries = [...obj.entries()]
    } else if (typeof obj === 'object') {
      entries = Object.entries(obj)
    }

    return flatMap(entries, ([key, value]: [string | number, any]) => {
      const childPath = pathConcat(pathSoFar, key)
      const { data = null, signal = Signals.preventRecursion } =
        typeof fn === 'function' ? fn(childPath, value, opts) : {}
      let children = null

      if (signal === Signals.continueRecursion) {
        if (value && typeof value === 'object') {
          const ch = paths(value, opts, childPath)
          if (ch.length > 0) {
            children = ch
          }
        }
      } else if (signal === Signals.preventRecursion) {
      } else {
        /* istanbul ignore next */
        assertNever(signal)
      }

      if (data !== null) {
        const result: TreePath<K> = {
          prop: childPath,
          data,
        }

        if (children) {
          result.c = children
        }

        return result
      } else if (children) {
        return children
      } else {
        return []
      }
    })
  }
}
