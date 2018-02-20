import { readdir } from 'fs-extra'
import { join } from 'path'
import { libDesc } from './index'



export async function getVersions(libsPath: string, name: string): Promise<libDesc[]> {
  const versions = await readdir(join(libsPath, name))
  return versions.map((version) => ({ name, version }))
}

export async function getNamesVersions(libsPath: string): Promise<libDesc[]> {
  const libs = await readdir(libsPath)
  return await libs.reduce(async (acc, name) => {
    const versions = await readdir(join(libsPath, name))
    const path = join(libsPath, name)
    const libVers = versions.map((version) => ({ path: join(path, version), name, version }))
    return (await acc).concat(libVers)
  }, <Promise<libDesc[]>> Promise.resolve([]))
}
