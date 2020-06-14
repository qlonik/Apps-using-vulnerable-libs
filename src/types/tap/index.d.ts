import { SpawnOptions } from 'child_process'

declare var tap: Tap
export = tap

declare interface Tap extends Test {
  default: Tap
  t: Tap

  mocha: Mocha
  mochaGlobals: Mocha['global']

  Test: TestConstructor
  Spawn: SpawnConstructor
  Stdin: StdinConstructor
}

declare class Test {
  /* flags */
  runOnly: boolean
  jobs: number

  /* setup */
  plan(n: number, comment?: string): void
  pragma(set: Options.Pragma): void
  autoend(value: boolean): void
  /* not documented */ setTimeout(n: number): void

  beforeEach(fn: (done: () => void) => Promise<unknown> | void): void
  afterEach(fn: (done: () => void) => Promise<unknown> | void): void
  teardown(fn: () => unknown): void
  tearDown(fn: () => unknown): void

  end(): void
  done(): void

  bailout(message?: string): void

  /* advanced */
  stdin(name: string, extra?: Options.Stdin): Promise<Test>
  spawn(cmd: string, args: string, options?: Options.Spawn, name?: string): Promise<Test>

  addAssert: AddAssertFn

  endAll(): void

  /* tests */
  test: TestFn
  todo: TestFn
  skip: TestFn
  only: TestFn

  /* reporting */
  /** Print the supplied message as a TAP comment */
  comment(message: string, ...args: any[]): void

  /** Return true if everything so far is ok */
  passing(): boolean

  /** Emit a passing test point */
  pass(message?: string, extra?: Options.Extra): boolean
  /** Emit a failing test point. */
  fail(message?: string, extra?: Options.Extra): boolean

  threw(er: Error, extra?: Options.Extra): void

  /* assertions */
  ok: Assertion.Basic
  true: Assertion.Basic
  assert: Assertion.Basic

  notOk: Assertion.Basic
  false: Assertion.Basic
  assertNot: Assertion.Basic

  error: Assertion.Basic
  ifError: Assertion.Basic
  ifErr: Assertion.Basic

  rejects: Assertion.Rejects

  resolves: Assertion.Resolves

  resolveMatch: Assertion.ResolveMatch

  throws: Assertion.Throws
  throw: Assertion.Throws

  doesNotThrow: Assertion.DoesNotThrow
  notThrow: Assertion.DoesNotThrow

  equal: Assertion.Equal
  equals: Assertion.Equal
  isEqual: Assertion.Equal
  is: Assertion.Equal
  strictEqual: Assertion.Equal
  strictEquals: Assertion.Equal
  strictIs: Assertion.Equal
  isStrict: Assertion.Equal
  isStrictly: Assertion.Equal
  identical: Assertion.Equal

  not: Assertion.NotEqual
  inequal: Assertion.NotEqual
  notEqual: Assertion.NotEqual
  notEquals: Assertion.NotEqual
  notStrictEqual: Assertion.NotEqual
  notStrictEquals: Assertion.NotEqual
  isNotEqual: Assertion.NotEqual
  isNot: Assertion.NotEqual
  doesNotEqual: Assertion.NotEqual
  isInequal: Assertion.NotEqual

  same: Assertion.Equal
  equivalent: Assertion.Equal
  looseEqual: Assertion.Equal
  looseEquals: Assertion.Equal
  deepEqual: Assertion.Equal
  deepEquals: Assertion.Equal
  isLoose: Assertion.Equal
  looseIs: Assertion.Equal
  isEquivalent: Assertion.Equal

  notSame: Assertion.NotEqual
  inequivalent: Assertion.NotEqual
  looseInequal: Assertion.NotEqual
  notDeep: Assertion.NotEqual
  deepInequal: Assertion.NotEqual
  notLoose: Assertion.NotEqual
  looseNot: Assertion.NotEqual
  notEquivalent: Assertion.NotEqual
  isNotDeepEqual: Assertion.NotEqual
  isNotDeeply: Assertion.NotEqual
  notDeepEqual: Assertion.NotEqual
  isInequivalent: Assertion.NotEqual
  isNotEquivalent: Assertion.NotEqual

  strictSame: Assertion.Equal
  strictEquivalent: Assertion.Equal
  strictDeepEqual: Assertion.Equal
  sameStrict: Assertion.Equal
  deepIs: Assertion.Equal
  isDeeply: Assertion.Equal
  isDeep: Assertion.Equal
  strictDeepEquals: Assertion.Equal

  strictNotSame: Assertion.NotEqual
  strictInequivalent: Assertion.NotEqual
  strictDeepInequal: Assertion.NotEqual
  notSameStrict: Assertion.NotEqual
  deepNot: Assertion.NotEqual
  notDeeply: Assertion.NotEqual
  strictDeepInequals: Assertion.NotEqual
  notStrictSame: Assertion.NotEqual

  match: Assertion.Match
  has: Assertion.Match
  hasFields: Assertion.Match
  matches: Assertion.Match
  similar: Assertion.Match
  like: Assertion.Match
  isLike: Assertion.Match
  includes: Assertion.Match
  include: Assertion.Match
  isSimilar: Assertion.Match
  contains: Assertion.Match

  notMatch: Assertion.Match
  dissimilar: Assertion.Match
  unsimilar: Assertion.Match
  notSimilar: Assertion.Match
  unlike: Assertion.Match
  isUnlike: Assertion.Match
  notLike: Assertion.Match
  isNotLike: Assertion.Match
  doesNotHave: Assertion.Match
  isNotSimilar: Assertion.Match
  isDissimilar: Assertion.Match

  type: Assertion.Type
  isa: Assertion.Type
  isA: Assertion.Type
}
declare interface TestConstructor {
  new (options?: Options.TestConstructor): Test
  prototype: Test
}

declare class Spawn extends Test {}
declare interface SpawnConstructor {
  new (options?: Options.SpawnConstructor): Spawn
  prototype: Spawn
}

declare class Stdin extends Test {}
declare interface StdinConstructor {
  new (options?: Options.Stdin): Stdin
  prototype: Stdin
}

declare namespace Options {
  interface Pragma {
    strict?: boolean
  }

  interface Assert {
    todo?: boolean | string
    skip?: boolean | string
    timeout?: number
    bail?: boolean
    autoend?: boolean
    diagnostic?: boolean
    buffered?: boolean
    jobs?: number
    grep?: ReadonlyArray<RegExp>
    only?: boolean
    runOnly?: boolean
  }

  interface Extra extends Assert {
    [prop: string]: any
  }
  interface TestConstructor extends Assert {
    name?: string
    cb?: givenTestFn
  }
  interface Spawn extends Assert, SpawnOptions {
    name?: string
  }
  interface SpawnConstructor extends Spawn {
    command: string
    args?: string | string[]
  }
  interface Stdin extends Assert {
    name?: string
    tapStream?: ReadableStream
  }
}

type givenTestFn = (t: Test) => Promise<unknown> | void
type promiseOrPromiseFn = Promise<unknown> | (() => Promise<unknown>)

interface TestFn {
  (cb: givenTestFn): Promise<Test>
  (name: string, cb: givenTestFn): Promise<Test>
  (options: Options.Assert, cb: givenTestFn): Promise<Test>
  (name?: string, options?: Options.Assert, cb?: givenTestFn): Promise<Test>
}
// prettier-ignore
interface AddAssertFn {
  (name: string, length: 1, fn: (A: unknown, message: string, extra: Options.Extra) => boolean): boolean
  (name: string, length: 2, fn: (A: unknown, B: unknown, message: string, extra: Options.Extra) => boolean): boolean
  (name: string, length: 3, fn: (A: unknown, B: unknown, C: unknown, message: string, extra: Options.Extra) => boolean): boolean
  (name: string, length: 4, fn: (A: unknown, B: unknown, C: unknown, D: unknown, message: string, extra: Options.Extra) => boolean): boolean
  (name: string, length: 5, fn: (A: unknown, B: unknown, C: unknown, D: unknown, E: unknown, message: string, extra: Options.Extra) => boolean): boolean
  (name: string, length: number, fn: (...args: any[]) => boolean): boolean
}
// prettier-ignore
declare namespace Assertion {
  interface Basic {
    (obj: unknown): boolean

    (obj: unknown, message: string): boolean
    (obj: unknown, extra: Options.Extra): boolean

    (obj: unknown, message: string, extra: Options.Extra): boolean
  }

  interface Throws {
    // two groups: one with fn, one without.
    // both groups are sorted by 4 params, 3 params, 2 params, 1 param

    (fn: () => unknown, errorMatches: unknown, message: string, extra: Options.Extra): boolean

    (fn: () => unknown, errorMatches: unknown, message: string): boolean
    (fn: () => unknown, errorMatches: unknown, extra: Options.Extra): boolean
    // /* not allowed */ (fn: () => unknown, message: string, extra: Options.Extra): boolean

    (fn: () => unknown, errorMatches: unknown): boolean
    (fn: () => unknown, message: string): boolean
    // /* not allowed */ (fn: () => unknown, extra: Options.Extra): boolean

    (fn: () => unknown): boolean

    (errorMatches: unknown, message: string, extra: Options.Extra): boolean

    (errorMatches: unknown, message: string): boolean
    (errorMatches: unknown, extra: Options.Extra): boolean
    // /* not allowed */ (message: string, extra: Options.Extra): boolean

    (errorMatches: unknown): boolean
    (message: string): boolean
    (extra: Options.Extra): boolean

    (): boolean
  }

  interface DoesNotThrow {
    (fn?: () => unknown, message?: string, extra?: Options.Extra): boolean
    (fn?: () => unknown, extra?: Options.Extra): boolean
    (message?: string, extra?: Options.Extra): boolean
    (extra?: Options.Extra): boolean
  }

  interface Equal {
    (found: unknown, wanted: unknown, message?: string, extra?: Options.Extra): boolean
    (found: unknown, wanted: unknown, extra?: Options.Extra): boolean
  }

  interface NotEqual {
    (found: unknown, notWanted: unknown, message?: string, extra?: Options.Extra): boolean
    (found: unknown, notWanted: unknown, extra?: Options.Extra): boolean
  }

  interface Match {
    (found: unknown, pattern: unknown, message?: string, extra?: Options.Extra): boolean
    (found: unknown, pattern: unknown, extra?: Options.Extra): boolean
  }

  interface Type {
    (found: unknown, type: string | ({ new (...args: any[]): any }), message?: string, extra?: Options.Extra): boolean
    (found: unknown, type: string | ({ new (...args: any[]): any }), extra?: Options.Extra): boolean
  }

  interface Rejects {
    // two groups: one with promise, one without.
    // both groups are sorted by 4 params, 3 params, 2 params, 1 param
    (p: promiseOrPromiseFn, errorMatches: unknown, message: string, extra: Options.Extra): Promise<void>

    (p: promiseOrPromiseFn, errorMatches: unknown, message: string): Promise<void>
    (p: promiseOrPromiseFn, errorMatches: unknown, extra: Options.Extra): Promise<void>
    // /* not allowed */ (p: promiseOrPromiseFn, message: string, extra: Options.Extra): Promise<void>

    (p: promiseOrPromiseFn, errorMatches: unknown): Promise<void>
    (p: promiseOrPromiseFn, message: string): Promise<void>
    // /* not allowed */ (p: promiseOrPromiseFn, extra: Options.Extra): Promise<void>

    (p: promiseOrPromiseFn): Promise<void>

    (errorMatches: unknown, message: string, extra: Options.Extra): Promise<void>

    (errorMatches: unknown, message: string): Promise<void>
    (errorMatches: unknown, extra: Options.Extra): Promise<void>
    // /* not allowed */ (message: string, extra: Options.Extra): Promise<void>

    (errorMatches: unknown): Promise<void>
    (message: string): Promise<void>
    (extra: Options.Extra): Promise<void>

    (): Promise<void>
  }

  interface Resolves {
    (p: promiseOrPromiseFn, message?: string, extra?: Options.Extra): Promise<void>
    (p: promiseOrPromiseFn, extra?: Options.Extra): Promise<void>
  }

  interface ResolveMatch {
    (p: promiseOrPromiseFn, wanted: unknown, message?: string, extra?: Options.Extra): Promise<void>
    (p: promiseOrPromiseFn, wanted: unknown, extra?: Options.Extra): Promise<void>
  }
}

interface mochaTestFn {
  (name?: string, fn?: (done: () => void) => Promise<unknown> | void): void
  (fn?: (done: () => void) => Promise<unknown> | void): void
}
declare interface Mocha {
  global: () => void

  describe: (name?: string, fn?: () => void) => void
  context: (name?: string, fn?: () => void) => void

  it: mochaTestFn
  specify: mochaTestFn
  before: mochaTestFn
  beforeEach: mochaTestFn
  after: mochaTestFn
  afterEach: mochaTestFn
}

declare global {
  const describe: Mocha['describe']
  const context: Mocha['context']

  const it: Mocha['it']
  const specify: Mocha['specify']
  const before: Mocha['before']
  const beforeEach: Mocha['beforeEach']
  const after: Mocha['after']
  const afterEach: Mocha['afterEach']
}
