import { pathExists, readdir, readJSON } from 'fs-extra'
import { join } from 'path'
import { memoize, MemoizedFunction } from 'lodash'
import { LiteralSignature, signatureNew } from '../extractStructure'
import { resolveAllOrInParallel } from '../utils'
import { LIB_LITERAL_SIGNATURE_FILE, SIG_FOLDER } from './constants'

/* eslint-disable no-unused-vars */
declare const __x: MemoizedFunction
/* eslint-enable */

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
export type libNameLiteralSigContent = libName & {
  literal: Set<LiteralSignature>
}

export const libPath = memoize(function _libPath(
  libsPath: string,
  name?: string,
  version?: string,
  file?: string,
): string {
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
},
(libsPath: string, name = '', version = '', file = '') => `${libsPath}/${name}/${version}/${file}`)

export const getLibNames = memoize(async function _getLibNames(
  libsPath: string,
  name?: string,
): Promise<libName[]> {
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
},
(libsPath: string, name = '') => `${libsPath}/${name}`)

export const getLibNameVersions = memoize(async function _getLibNameVersions(
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
},
(libsPath: string, name = '', version = '') => `${libsPath}/${name}/${version}`)

export const getLibNameVersionSigFiles = memoize(async function _getLibNameVersionSigFiles(
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
},
(libsPath: string, name = '', version = '', file = '') => `${libsPath}/${name}/${version}/${file}`)

export const getLibLiteralSig = async function _getLibLiteralSig(
  libsPath: string,
  name?: string,
): Promise<libNameLiteralSigContent[]> {
  const libs = await getLibNames(libsPath, name)
  return Promise.all(
    libs.map(async ({ name }) => {
      const path = join(libsPath, name, LIB_LITERAL_SIGNATURE_FILE)
      const loaded = (await readJSON(path)) as LiteralSignature[]
      return { name, literal: new Set(loaded) }
    }),
  )
}

const memLoadSig = memoize(
  (libsPath: string, name: string, version: string, file: string): Promise<signatureNew> =>
    readJSON(libPath(libsPath, name, version, file)),
  (a: string, b: string, c: string, d: string): string => `${a}/${b}/${c}/${d}`,
)
export async function getLibNameVersionSigContents(
  libsPath: string,
  name?: string,
  version?: string,
  file?: string,
): Promise<libNameVersionSigContent[]> {
  const files = await getLibNameVersionSigFiles(libsPath, name, version, file)
  return resolveAllOrInParallel(
    files.map(({ name, version, file }) => async () => ({
      name,
      version,
      file,
      signature: await memLoadSig(libsPath, name, version, file),
    })),
  )
}
