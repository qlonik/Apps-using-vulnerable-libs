interface Opts {
  async: boolean
  defer: boolean
  delay: number
  id: string
  initCount: number
  maxTime: number
  minSamples: number
  minTime: number
  name: string
  onAbort: () => any
  onComplete: () => any
  onCycle: () => any
  onError: () => any
  onReset: () => any
  onStart: () => any
}

declare interface ChuhaiBench {
  set<T extends keyof Opts>(key: T, value: Opts[T]): void

  cycle(impl: () => any): void
  burn(title: string, impl: () => any): void
  bench(title: string, impl: () => any): void
}

// eslint-disable-next-line import/no-default-export
export default function chuhaiFn(title: string, impl: (s: ChuhaiBench) => any): Promise<any>
