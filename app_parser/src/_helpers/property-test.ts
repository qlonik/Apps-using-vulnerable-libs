/* eslint-disable ava/use-test, no-unused-vars */

import { ExecutionContext, Implementation, ImplementationResult, Macro } from 'ava'
import jsc, { Arbitrary, ArbitraryLike, Options, Result } from 'jsverify'
import { inspect } from 'util'

const isArbitraryLike = (o: any): o is ArbitraryLike<any> => {
  return 'generator' in o
}

const cloneInstance = <T>(o: T): T => {
  return Object.assign(Object.create(Object.getPrototypeOf(o)), o)
}

const prettyPrintResult = (r: Result<any>): string => {
  const rngState = inspect(r.rngState, { colors: true })
  const inspectedCounterEx = inspect(r.counterexample, { depth: null, colors: true })
  const counterEx = inspectedCounterEx.includes('\n')
    ? '\n  ' +
      inspectedCounterEx
        .slice(2, -2)
        .split('\n')
        .map((s) => '      ' + s)
        .join('\n') +
      '\n    '
    : inspectedCounterEx

  return ` (${counterEx}) rngState: ${rngState}`
}

export const check: CheckFn = function check(...args: any[]): Implementation {
  const defaultOpts = { quiet: true }
  const firstArg = !isArbitraryLike(args[0]) ? args.shift() : {}
  const opts = Object.assign(defaultOpts, firstArg) as Options
  const propertyFn = args.pop() as Macro
  const arbitraries = args as Arbitrary<any>[]

  return async function jsc$test(this: any, test) {
    const allLogs = [] as string[][]
    const prop = jsc.forall(...arbitraries, async (...args: any[]) => {
      const clonedThis = cloneInstance(this)
      allLogs.push((clonedThis.logs = []))
      clonedThis.fn = (t: ExecutionContext) => propertyFn.call(clonedThis, t, ...args)
      const result = await clonedThis.run()
      return result.passed || result.error
    })
    const result = await jsc.check(prop, opts)

    if (typeof result === 'object') {
      this.title += prettyPrintResult(result)
      return propertyFn.call(this, test, ...result.counterexample)
    } else if (result === true) {
      for (let log of allLogs[jsc.random(0, allLogs.length - 1)]) {
        this.addLog(log)
      }
      test.pass()
    } else {
      test.fail('Unknown result returned from JSVerify')
    }
  }
}

// prettier-ignore
export interface CheckFn {
  <A, T>(a: Arbitrary<A>, prop: (t: ExecutionContext<T>, a: A) => ImplementationResult): Implementation<T>
  <A, T>(opts: Options, a: Arbitrary<A>, prop: (t: ExecutionContext<T>, a: A) => ImplementationResult): Implementation<T>
  <A, B, T>(a: Arbitrary<A>, b: Arbitrary<B>, prop: (t: ExecutionContext<T>, a: A, b: B) => ImplementationResult): Implementation<T>
  <A, B, T>(opts: Options, a: Arbitrary<A>, b: Arbitrary<B>, prop: (t: ExecutionContext<T>, a: A, b: B) => ImplementationResult): Implementation<T>
  <A, B, C, T>(a: Arbitrary<A>, b: Arbitrary<B>, c: Arbitrary<C>, prop: (t: ExecutionContext<T>, a: A, b: B, c: C) => ImplementationResult): Implementation<T>
  <A, B, C, T>(opts: Options, a: Arbitrary<A>, b: Arbitrary<B>, c: Arbitrary<C>, prop: (t: ExecutionContext<T>, a: A, b: B, c: C) => ImplementationResult): Implementation<T>
  <A, B, C, D, T>(a: Arbitrary<A>, b: Arbitrary<B>, c: Arbitrary<C>, d: Arbitrary<D>, prop: (t: ExecutionContext<T>, a: A, b: B, c: C, d: D) => ImplementationResult): Implementation<T>
  <A, B, C, D, T>(opts: Options, a: Arbitrary<A>, b: Arbitrary<B>, c: Arbitrary<C>, d: Arbitrary<D>, prop: (t: ExecutionContext<T>, a: A, b: B, c: C, d: D) => ImplementationResult): Implementation<T>
  <A, B, C, D, E, T>(a: Arbitrary<A>, b: Arbitrary<B>, c: Arbitrary<C>, d: Arbitrary<D>, e: Arbitrary<E>, prop: (t: ExecutionContext<T>, a: A, b: B, c: C, d: D, e: E) => ImplementationResult): Implementation<T>
  <A, B, C, D, E, T>(opts: Options, a: Arbitrary<A>, b: Arbitrary<B>, c: Arbitrary<C>, d: Arbitrary<D>, e: Arbitrary<E>, prop: (t: ExecutionContext<T>, a: A, b: B, c: C, d: D, e: E) => ImplementationResult): Implementation<T>
  <A, B, C, D, E, F, T>(a: Arbitrary<A>, b: Arbitrary<B>, c: Arbitrary<C>, d: Arbitrary<D>, e: Arbitrary<E>, f: Arbitrary<F>, prop: (t: ExecutionContext<T>, a: A, b: B, c: C, d: D, e: E, f: F) => ImplementationResult): Implementation<T>
  <A, B, C, D, E, F, T>(opts: Options, a: Arbitrary<A>, b: Arbitrary<B>, c: Arbitrary<C>, d: Arbitrary<D>, e: Arbitrary<E>, f: Arbitrary<F>, prop: (t: ExecutionContext<T>, a: A, b: B, c: C, d: D, e: E, f: F) => ImplementationResult): Implementation<T>
  <A, B, C, D, E, F, G, T>(a: Arbitrary<A>, b: Arbitrary<B>, c: Arbitrary<C>, d: Arbitrary<D>, e: Arbitrary<E>, f: Arbitrary<F>, g: Arbitrary<G>, prop: (t: ExecutionContext<T>, a: A, b: B, c: C, d: D, e: E, f: F, g: G) => ImplementationResult): Implementation<T>
  <A, B, C, D, E, F, G, T>(opts: Options, a: Arbitrary<A>, b: Arbitrary<B>, c: Arbitrary<C>, d: Arbitrary<D>, e: Arbitrary<E>, f: Arbitrary<F>, g: Arbitrary<G>, prop: (t: ExecutionContext<T>, a: A, b: B, c: C, d: D, e: E, f: F, g: G) => ImplementationResult): Implementation<T>
  <A, B, C, D, E, F, G, H, T>(a: Arbitrary<A>, b: Arbitrary<B>, c: Arbitrary<C>, d: Arbitrary<D>, e: Arbitrary<E>, f: Arbitrary<F>, g: Arbitrary<G>, h: Arbitrary<H>, prop: (t: ExecutionContext<T>, a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H) => ImplementationResult): Implementation<T>
  <A, B, C, D, E, F, G, H, T>(opts: Options, a: Arbitrary<A>, b: Arbitrary<B>, c: Arbitrary<C>, d: Arbitrary<D>, e: Arbitrary<E>, f: Arbitrary<F>, g: Arbitrary<G>, h: Arbitrary<H>, prop: (t: ExecutionContext<T>, a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H) => ImplementationResult): Implementation<T>
  <A, B, C, D, E, F, G, H, I, T>(a: Arbitrary<A>, b: Arbitrary<B>, c: Arbitrary<C>, d: Arbitrary<D>, e: Arbitrary<E>, f: Arbitrary<F>, g: Arbitrary<G>, h: Arbitrary<H>, i: Arbitrary<I>, prop: (t: ExecutionContext<T>, a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I) => ImplementationResult): Implementation<T>
  <A, B, C, D, E, F, G, H, I, T>(opts: Options, a: Arbitrary<A>, b: Arbitrary<B>, c: Arbitrary<C>, d: Arbitrary<D>, e: Arbitrary<E>, f: Arbitrary<F>, g: Arbitrary<G>, h: Arbitrary<H>, i: Arbitrary<I>, prop: (t: ExecutionContext<T>, a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I) => ImplementationResult): Implementation<T>
  <A, B, C, D, E, F, G, H, I, J, T>(a: Arbitrary<A>, b: Arbitrary<B>, c: Arbitrary<C>, d: Arbitrary<D>, e: Arbitrary<E>, f: Arbitrary<F>, g: Arbitrary<G>, h: Arbitrary<H>, i: Arbitrary<I>, j: Arbitrary<J>, prop: (t: ExecutionContext<T>, a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J) => ImplementationResult): Implementation<T>
  <A, B, C, D, E, F, G, H, I, J, T>(opts: Options, a: Arbitrary<A>, b: Arbitrary<B>, c: Arbitrary<C>, d: Arbitrary<D>, e: Arbitrary<E>, f: Arbitrary<F>, g: Arbitrary<G>, h: Arbitrary<H>, i: Arbitrary<I>, j: Arbitrary<J>, prop: (t: ExecutionContext<T>, a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J) => ImplementationResult): Implementation<T>
  <T>(/* options?, ...arbitrary, propertyFn */ ...args: any[]): Implementation<T>
}
