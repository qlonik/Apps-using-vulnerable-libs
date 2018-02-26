declare module 'workerpool' {
  import { Fn } from 'typical-mini'

  class PromiseLike<T> {
    public static CancellationError: ErrorConstructor
    public static TimetoutError: ErrorConstructor

    public constructor(handler: () => void, parent?: PromiseLike<any>)

    public then<TResult1 = T, TResult2 = never>(
      onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
      onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null,
    ): Promise<TResult1 | TResult2>

    public catch<TResult = never>(
      onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null,
    ): Promise<T | TResult>

    public cancel(): Promise<T>

    public timeout(n: number): Promise<T>

    public always<R>(fn: (arg: T) => R): Promise<R>

    public static all<TAll>(values: Iterable<TAll | Promise<TAll>>): Promise<TAll[]>

    public static defer<T>(): {
      promise: Promise<T>
      resolve(res?: T | Promise<T>): void
      reject(err?: any): void
    }
  }

  class Pool<T extends MessagesMap> {
    public readonly minWorkers: number
    public readonly maxWorkers: number
    public readonly script: string | null
    public readonly forkArgs: string[] // default []
    public readonly forkOpts: {} // default {}
    public readonly debugPortStart: number // default 43210

    public readonly workers: any[]
    public readonly tasks: any[]

    private constructor(script: string, options?: PoolOptions)
    private constructor(options?: PoolOptions)

    public exec<M extends keyof T>(m: M, p: T[M][0]): Promise<T[M][1]>
    public exec<P extends any[], R>(fn: Fn<P, R>, p: P): Promise<R>

    public proxy(): Promise<ProxiedWorkerFunctionsMap<T>>

    public stats(): Stats

    public terminate(force?: boolean, timeout?: number): Promise<void>
  }

  type MessagesMap = {
    [x: string]: [any[], any]
  }

  type WorkerFunctionsMap<T extends MessagesMap> = {
    [S in keyof T]: Fn<T[S][0], T[S][1] | Promise<T[S][1]>>
  }

  type ProxiedWorkerFunctionsMap<T extends MessagesMap> = {
    [S in keyof T]: Fn<T[S][0], Promise<T[S][1]>>
  }

  interface PoolOptions {
    minWorkers?: number | 'max'
    maxWorkers?: number
  }

  interface Stats {
    totalWorkers: number
    busyWorkers: number
    idleWorkers: number
    pendingTasks: number
    activeTasks: number
  }

  export function pool<T extends MessagesMap>(script: string, options?: PoolOptions): Pool<T>
  export function pool<T extends MessagesMap>(options?: PoolOptions): Pool<T>

  export function worker<T extends MessagesMap>(methods: WorkerFunctionsMap<T>): void

  export const platform: 'browser' | 'node'
  export const isMainThread: boolean
  export const cpus: number
}
