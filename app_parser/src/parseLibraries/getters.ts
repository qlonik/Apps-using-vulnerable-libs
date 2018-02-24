import { pathExists, readdir, readJSON } from 'fs-extra'
import { join } from 'path'
import { signatureNew } from '../extractStructure'
import { resolveAllOrInParallel } from '../utils'
import { SIG_FOLDER } from './constants'

export type libName = {
  name: string
}
export type libNameVersion = libName & {
  version: string
}
export type libNameVersionSigFile = libNameVersion & {
  file: string
}
export type libNameVersionSigContent = libNameVersionSigFile & {
  signature: signatureNew
}

export function libPath(libsPath: string, name?: string, version?: string, file?: string): string {
  let path = libsPath
  if (name) {
    path = join(path, name)
  }
  if (version) {
    path = join(path, version)
  }
  if (file) {
    path = join(path, SIG_FOLDER, file)
  }

  return path
}

export async function getLibNames(libsPath: string, name?: string): Promise<libName[]> {
  if (name) {
    if (
      name.startsWith('_') ||
      name.endsWith('.lock') ||
      !await pathExists(libPath(libsPath, name))
    ) {
      return []
    }
    return [{ name }]
  } else {
    if (!await pathExists(libPath(libsPath))) {
      return []
    }
    const names = await readdir(libsPath)
    return names
      .filter((name) => !name.startsWith('_') || !name.endsWith('.lock'))
      .sort()
      .map((name) => ({ name }))
  }
}

export async function getLibNameVersions(
  libsPath: string,
  name?: string,
  version?: string,
): Promise<libNameVersion[]> {
  const names = await getLibNames(libsPath, name)
  return names.reduce(async (acc, { name }) => {
    if (version) {
      if (version.startsWith('_') || !await pathExists(libPath(libsPath, name, version))) {
        return await acc
      }
      return (await acc).concat({ name, version })
    } else {
      const versions = (await readdir(libPath(libsPath, name)))
        .filter((version) => !version.startsWith('_'))
        .sort()
        .map((version) => ({ name, version }))
      return (await acc).concat(versions)
    }
  }, Promise.resolve([] as libNameVersion[]))
}

export async function getLibNameVersionSigFiles(
  libsPath: string,
  name?: string,
  version?: string,
  file?: string,
): Promise<libNameVersionSigFile[]> {
  const libs = await getLibNameVersions(libsPath, name, version)
  return libs.reduce(async (acc, { name, version }) => {
    if (file) {
      if (file.startsWith('_') || !await pathExists(libPath(libsPath, name, version, file))) {
        return await acc
      }
      return (await acc).concat({ name, version, file })
    } else {
      const sigsPath = join(libPath(libsPath, name, version), SIG_FOLDER)
      if (!await pathExists(sigsPath)) {
        return await acc
      }
      const files = (await readdir(sigsPath))
        .filter((file) => !file.startsWith('_'))
        .sort()
        .map((file) => ({ name, version, file }))
      return (await acc).concat(files)
    }
  }, Promise.resolve([] as libNameVersionSigFile[]))
}

export async function getLibNameVersionSigContents(
  libsPath: string,
  name?: string,
  version?: string,
  file?: string,
): Promise<libNameVersionSigContent[]> {
  const files = await getLibNameVersionSigFiles(libsPath, name, version, file)
  return resolveAllOrInParallel(
    files.map(({ name, version, file }) => {
      return async () => {
        const signature = (await readJSON(libPath(libsPath, name, version, file))) as signatureNew
        return { name, version, file, signature }
      }
    }),
  )
}
