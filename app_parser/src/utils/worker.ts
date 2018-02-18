import { pathExists } from 'fs-extra'
import { basename, dirname, extname, join } from 'path'


export const getWorkerPath = async (file: string): Promise<string> => {
  const ext = extname(file)
  const name = basename(file, ext)
  const wPath = join(dirname(file), `${name}.worker${ext}`)

  if (await pathExists(wPath)) {
    return wPath
  }
  else {
    throw new Error('no worker present')
  }
}
