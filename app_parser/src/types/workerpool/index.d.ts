declare module 'workerpool' {
  import { Fn } from 'typical-mini'

  class PromiseLike<T> {
    constructor(handler: () => void, parent?: PromiseLike<any>);

    then<TResult1 = T, TResult2 = never>(
      onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
      onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): Promise<TResult1 | TResult2>;

    catch<TResult = never>(
      onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): Promise<T | TResult>;

    cancel(): Promise<T>

    timeout(n: number): Promise<T>

    always<R>(fn: (arg: T) => R): Promise<R>

    static all<TAll>(values: Iterable<TAll | Promise<TAll>>): Promise<TAll[]>

    static defer<T>(): {
      promise: Promise<T>,
      resolve(res?: T | Promise<T>): void,
      reject(err?: any): void,
    }

    static CancellationError: ErrorConstructor
    static TimetoutError: ErrorConstructor
  }

  class Pool<T extends MessagesMap> {
    exec<M extends keyof T>(m: M, p: T[M][0]): Promise<T[M][1]>
    exec<P extends any[], R>(fn: Fn<P, R>, p: P): Promise<R>

    proxy(): Promise<WorkerFunctionsMap<T>>

    stats(): Stats

    terminate(force?: boolean, timeout?: number): Promise<void>
  }

  type MessagesMap = {
    [x: string]: [any[], any]
  }

  type WorkerFunctionsMap<T extends MessagesMap> = {
    [S in keyof T]: Fn<T[S][0], T[S][1] | Promise<T[S][1]>>
    }

  interface PoolOptions {
    minWorkers?: number | 'max';
    maxWorkers?: number;
  }

  interface Stats {
    totalWorkers: number;
    busyWorkers: number;
    idleWorkers: number;
    pendingTasks: number;
    activeTasks: number;
  }


  export function pool<T extends MessagesMap>(script: string, options?: PoolOptions): Pool<T>;
  export function pool<T extends MessagesMap>(options?: PoolOptions): Pool<T>;

  export function worker<T extends MessagesMap>(methods: WorkerFunctionsMap<T>): void;

  export const platform: 'browser' | 'node';
  export const isMainThread: boolean;
  export const cpus: number;
}
