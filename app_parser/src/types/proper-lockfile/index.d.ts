interface LockOptions {
  stale?: number // default: 10000
  update?: number // default: stale/2
  retries?: number // default: 0
  realpath?: boolean // default: true
  fs?: any // default: graceful-fs
  onCompromised?: (err: Error) => void // default: (err) => throw err
}

interface UnlockOptions {
  realpath?: boolean // default: true
  fs?: any // default: graceful-fs
}

interface CheckOptions {
  stale?: number // default: 10000
  realpath?: boolean // default: true
  fs?: any // default: graceful-fs
}

interface ProperLockfile {
  (file: string, options?: LockOptions): Promise<() => Promise<void>>
  lock(file: string, options?: LockOptions): Promise<() => Promise<void>>
  lockSync(file: string, options?: LockOptions): () => void

  unlock(file: string, options?: UnlockOptions): Promise<void>
  unlockSync(file: string, options?: UnlockOptions): void

  check(file: string, options?: CheckOptions): Promise<boolean>
  checkSync(file: string, options?: CheckOptions): boolean
}

declare const x: ProperLockfile
export = x
