declare module 'proper-lockfile' {
  interface lockOptions {
    stale: number, // default: 10000
    update: number, // default: stale/2
    retries: number, // default: 0
    realpath: boolean, // default: true
    fs: any, // default: graceful-fs
    onCompromised: (err: Error) => void, // default: (err) => throw err
  }

  interface unlockOptions {
    realpath: boolean, // default: true
    fs: any, // default: graceful-fs
  }

  interface checkOptions {
    stale: number, // default: 10000
    realpath: boolean, // default: true
    fs: any, // default: graceful-fs
  }

  interface properLockfile {
    (file: string, options?: Partial<lockOptions>): Promise<() => Promise<void>>
    lock(file: string, options?: Partial<lockOptions>): Promise<() => Promise<void>>
    lockSync(file: string, options?: Partial<lockOptions>): () => void

    unlock(file: string, options?: Partial<unlockOptions>): Promise<void>
    unlockSync(file: string, options?: Partial<unlockOptions>): void

    check(file: string, options?: Partial<checkOptions>): Promise<boolean>
    checkSync(file: string, options?: Partial<checkOptions>): boolean
  }

  const x: properLockfile
  export = x
}
