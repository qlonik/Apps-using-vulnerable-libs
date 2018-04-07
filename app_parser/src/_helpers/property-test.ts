/* eslint-disable ava/use-test, no-unused-vars */

import { ExecutionContext, Implementation, ImplementationResult, Macro } from 'ava'
import jsc, { Arbitrary, ArbitraryLike, Options, Result } from 'jsverify'
import { inspect } from 'util'

const isArbitraryLike = (o: any): o is ArbitraryLike<any> => {
  return 'generator' in o
}

export const arb = jsc

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
    const prop = jsc.forall(...arbitraries, async (...args: any[]) => {
      const clonedThis = cloneInstance(this)
      clonedThis.fn = (t: ExecutionContext) => propertyFn.call(clonedThis, t, ...args)
      const result = await clonedThis.run()
      return result.passed || result.error
    })
    const result = await jsc.check(prop, opts)

    if (typeof result === 'object') {
      this.title += prettyPrintResult(result)
      return propertyFn.call(this, test, ...result.counterexample)
    } else {
      test.pass()
    }
  }
}

// prettier-ignore
export interface CheckFn {
  <A>(a: Arbitrary<A>, prop: (t: ExecutionContext, a: A) => ImplementationResult): Implementation
  <A>(opts: Options, a: Arbitrary<A>, prop: (t: ExecutionContext, a: A) => ImplementationResult): Implementation
  <A, B>(a: Arbitrary<A>, b: Arbitrary<B>, prop: (t: ExecutionContext, a: A, b: B) => ImplementationResult): Implementation
  <A, B>(opts: Options, a: Arbitrary<A>, b: Arbitrary<B>, prop: (t: ExecutionContext, a: A, b: B) => ImplementationResult): Implementation
  <A, B, C>(a: Arbitrary<A>, b: Arbitrary<B>, c: Arbitrary<C>, prop: (t: ExecutionContext, a: A, b: B, c: C) => ImplementationResult): Implementation
  <A, B, C>(opts: Options, a: Arbitrary<A>, b: Arbitrary<B>, c: Arbitrary<C>, prop: (t: ExecutionContext, a: A, b: B, c: C) => ImplementationResult): Implementation
  <A, B, C, D>(a: Arbitrary<A>, b: Arbitrary<B>, c: Arbitrary<C>, d: Arbitrary<D>, prop: (t: ExecutionContext, a: A, b: B, c: C, d: D) => ImplementationResult): Implementation
  <A, B, C, D>(opts: Options, a: Arbitrary<A>, b: Arbitrary<B>, c: Arbitrary<C>, d: Arbitrary<D>, prop: (t: ExecutionContext, a: A, b: B, c: C, d: D) => ImplementationResult): Implementation
  <A, B, C, D, E>(a: Arbitrary<A>, b: Arbitrary<B>, c: Arbitrary<C>, d: Arbitrary<D>, e: Arbitrary<E>, prop: (t: ExecutionContext, a: A, b: B, c: C, d: D, e: E) => ImplementationResult): Implementation
  <A, B, C, D, E>(opts: Options, a: Arbitrary<A>, b: Arbitrary<B>, c: Arbitrary<C>, d: Arbitrary<D>, e: Arbitrary<E>, prop: (t: ExecutionContext, a: A, b: B, c: C, d: D, e: E) => ImplementationResult): Implementation
  <A, B, C, D, E, F>(a: Arbitrary<A>, b: Arbitrary<B>, c: Arbitrary<C>, d: Arbitrary<D>, e: Arbitrary<E>, f: Arbitrary<F>, prop: (t: ExecutionContext, a: A, b: B, c: C, d: D, e: E, f: F) => ImplementationResult): Implementation
  <A, B, C, D, E, F>(opts: Options, a: Arbitrary<A>, b: Arbitrary<B>, c: Arbitrary<C>, d: Arbitrary<D>, e: Arbitrary<E>, f: Arbitrary<F>, prop: (t: ExecutionContext, a: A, b: B, c: C, d: D, e: E, f: F) => ImplementationResult): Implementation
  <A, B, C, D, E, F, G>(a: Arbitrary<A>, b: Arbitrary<B>, c: Arbitrary<C>, d: Arbitrary<D>, e: Arbitrary<E>, f: Arbitrary<F>, g: Arbitrary<G>, prop: (t: ExecutionContext, a: A, b: B, c: C, d: D, e: E, f: F, g: G) => ImplementationResult): Implementation
  <A, B, C, D, E, F, G>(opts: Options, a: Arbitrary<A>, b: Arbitrary<B>, c: Arbitrary<C>, d: Arbitrary<D>, e: Arbitrary<E>, f: Arbitrary<F>, g: Arbitrary<G>, prop: (t: ExecutionContext, a: A, b: B, c: C, d: D, e: E, f: F, g: G) => ImplementationResult): Implementation
  <A, B, C, D, E, F, G, H>(a: Arbitrary<A>, b: Arbitrary<B>, c: Arbitrary<C>, d: Arbitrary<D>, e: Arbitrary<E>, f: Arbitrary<F>, g: Arbitrary<G>, h: Arbitrary<H>, prop: (t: ExecutionContext, a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H) => ImplementationResult): Implementation
  <A, B, C, D, E, F, G, H>(opts: Options, a: Arbitrary<A>, b: Arbitrary<B>, c: Arbitrary<C>, d: Arbitrary<D>, e: Arbitrary<E>, f: Arbitrary<F>, g: Arbitrary<G>, h: Arbitrary<H>, prop: (t: ExecutionContext, a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H) => ImplementationResult): Implementation
  <A, B, C, D, E, F, G, H, I>(a: Arbitrary<A>, b: Arbitrary<B>, c: Arbitrary<C>, d: Arbitrary<D>, e: Arbitrary<E>, f: Arbitrary<F>, g: Arbitrary<G>, h: Arbitrary<H>, i: Arbitrary<I>, prop: (t: ExecutionContext, a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I) => ImplementationResult): Implementation
  <A, B, C, D, E, F, G, H, I>(opts: Options, a: Arbitrary<A>, b: Arbitrary<B>, c: Arbitrary<C>, d: Arbitrary<D>, e: Arbitrary<E>, f: Arbitrary<F>, g: Arbitrary<G>, h: Arbitrary<H>, i: Arbitrary<I>, prop: (t: ExecutionContext, a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I) => ImplementationResult): Implementation
  <A, B, C, D, E, F, G, H, I, J>(a: Arbitrary<A>, b: Arbitrary<B>, c: Arbitrary<C>, d: Arbitrary<D>, e: Arbitrary<E>, f: Arbitrary<F>, g: Arbitrary<G>, h: Arbitrary<H>, i: Arbitrary<I>, j: Arbitrary<J>, prop: (t: ExecutionContext, a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J) => ImplementationResult): Implementation
  <A, B, C, D, E, F, G, H, I, J>(opts: Options, a: Arbitrary<A>, b: Arbitrary<B>, c: Arbitrary<C>, d: Arbitrary<D>, e: Arbitrary<E>, f: Arbitrary<F>, g: Arbitrary<G>, h: Arbitrary<H>, i: Arbitrary<I>, j: Arbitrary<J>, prop: (t: ExecutionContext, a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J) => ImplementationResult): Implementation
  (/* options?, ...arbitrary, propertyFn */ ...args: any[]): Implementation
}
