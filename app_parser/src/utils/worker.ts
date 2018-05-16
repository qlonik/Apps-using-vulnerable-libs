import { pathExists } from 'fs-extra'
import { basename, dirname, extname, join } from 'path'
import { pool, PoolOptions } from 'workerpool'
import { fd } from './logger'

export const getWorkerPath = async (file: string): Promise<string> => {
  const ext = extname(file)
  const name = basename(file, ext)
  const wPath = join(dirname(file), `${name}.worker${ext}`)

  if (await pathExists(wPath)) {
    return wPath
  } else {
    throw new Error('no worker present')
  }
}

export const poolFactory: typeof pool = (str?: string | PoolOptions, opts?: PoolOptions) => {
  let script: string | null
  if (typeof str === 'string') {
    script = str || null
  } else {
    script = null
    opts = str
  }
  opts = opts || {}

  const options: PoolOptions = {
    ...opts,
    forkOpts: {
      ...('forkOpts' in opts ? opts.forkOpts : {}),
      stdio: ['inherit', 'inherit', 'inherit', 'ipc'].concat(
        fd ? new Array(fd - 4).fill(null).concat(fd) : [],
      ),
    },
  }

  return script === null ? pool(options) : pool(script, options)
}
