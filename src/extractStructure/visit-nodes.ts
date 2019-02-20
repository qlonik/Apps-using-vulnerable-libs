import { Node as BabelNode } from 'babel-types'
import R from 'ramda'
import { assertNever, isNonNullable } from '../utils'
import { opts } from './options'

export type TreePath<T> = {
  /** property name */
  prop: string
  /** custom data */
  data: T
  /** node of the AST */
  node?: BabelNode
  /** children */
  // eslint-disable-next-line typescript/no-use-before-define
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
  return p.concat(typeof c === 'number' ? `[${c}]` : p === '' ? c : '.' + c)
}

export const visitNodes = <K>(
  fn: undefined | ((path: string, val: any, opts: opts) => Signal<K>) = undefined,
) => {
  return function paths(
    obj: object | Array<any>,
    opts: opts,
    pathSoFar: string = '',
  ): TreePath<K>[] {
    const entries = Array.isArray(obj)
      ? [...obj.entries()]
      : typeof obj === 'object'
      ? Object.entries(obj)
      : []

    return R.chain<[string | number, unknown], TreePath<K>>(([key, value]) => {
      const childPath = pathConcat(pathSoFar, key)
      const { data = null, signal = Signals.preventRecursion } =
        typeof fn === 'function' ? fn(childPath, value, opts) : {}
      let children = null

      if (signal === Signals.continueRecursion) {
        if (typeof value === 'object' && isNonNullable(value)) {
          const ch = paths(value, opts, childPath)
          if (ch.length > 0) {
            children = ch
          }
        }
      } else if (signal === Signals.preventRecursion) {
        // do nothing
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

        return [result]
      } else if (children) {
        return children
      } else {
        return []
      }
    }, entries)
  }
}
