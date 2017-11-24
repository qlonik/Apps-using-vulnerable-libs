import { copy, ensureDir, move, pathExists, readdir, readFile, remove } from 'fs-extra'
import { basename, dirname, extname, join, relative, resolve } from 'path'
import { inspect } from 'util';
import { extractStructure } from './extractStructure'
import { chunk, leftPad, opts, resolveParallelGroups, tgzUnpack } from './utils'
import { fileDesc, fileDescOp, myWriteJSON } from './utils/files'
import debug = require('debug')


export type libDesc = {
  name: string,
  version: string,
}
type parseLibraryInPathConf = {
  libsPath: string,
  libDesc: libDesc,
}

const parLibInPathLog = debug(`parLibInPath`)

async function extractFromNpmPackage(pkgPath: string): Promise<string | null> {
  const absolutePkgPath = resolve(process.cwd(), pkgPath)
  let mainPath = null
  try {
    mainPath = require.resolve(absolutePkgPath)
  }
  finally {
  }
  return relative(pkgPath, mainPath)
}

function getMinJs(path: string | null) {
  if (path === null) {
    return null
  }

  const mainPathDir = dirname(path)
  const mainPathExt = extname(path)
  const mainPathBaseName = basename(path, mainPathExt)
  return join(mainPathDir, `${mainPathBaseName}.min${mainPathExt}`)
}

export async function extractMainFiles(libPath: string): Promise<fileDescOp[]> {

  const result: fileDescOp[] = []

  const libPackageP = join(libPath, 'package')
  const npmMainTemp = await extractFromNpmPackage(libPackageP)
  const npmMain = npmMainTemp !== null ? join('package', npmMainTemp) : null
  const npmMainMin = getMinJs(npmMain)

  if (npmMain !== null) {
    const i = leftPad(result.length)
    result.push({ type: 'copy', cwd: libPath, src: npmMain, dst: `mains/${i}.main.js` })
  }
  if (npmMainMin !== null && await pathExists(join(libPath, npmMainMin))) {
    const i = leftPad(result.length)
    result.push({ type: 'copy', cwd: libPath, src: npmMainMin, dst: `mains/${i}.main.min.js` })
  }

  return result
}

const extractIndexFromFilenameRegex = /(\d+)\..*/

async function analyseOneLibFile(
  file: fileDesc, { conservative = true }: opts): Promise<fileDescOp> {

  const { cwd, dst } = file

  const indexOrNull = extractIndexFromFilenameRegex.exec(basename(dst))
  if (indexOrNull === null) {
    throw new Error('couldn\'t parse filename')
  }
  const index = parseInt(indexOrNull[1], 10)
  const destSig = `sigs/${index}.json`

  const fileP = join(cwd, dst)
  const content = await readFile(fileP, 'utf-8')
  const signature = await extractStructure({ content })

  return { type: 'json', cwd, dst: destSig, json: signature }
}

export async function analyseLibFiles(
  files: fileDesc | fileDesc[],
  { chunkLimit = 15, chunkSize = 10, conservative = true }: opts = {}): Promise<fileDescOp[]> {

  if (!Array.isArray(files)) {
    return [await analyseOneLibFile(files, { conservative })]
  }

  if (files.length < chunkLimit) {
    return await Promise.all(files.map((file) => analyseOneLibFile(file, { conservative })))
  }
  else {
    let lazySaved = files.map((file) => {
      return async () => analyseOneLibFile(file, { conservative })
    })
    return await resolveParallelGroups(chunk(lazySaved, chunkSize))
  }
}

async function parseLibraryInPath({ libsPath, libDesc: { name, version } }: parseLibraryInPathConf) {
  const libPath = join(libsPath, name, version)
  const pkgPath = resolve(process.cwd(), libPath, 'package')

  const mainPath = await extractFromNpmPackage(pkgPath)

  if (mainPath === null) {
    return
  }

  const mainPathMin = getMinJs(mainPath)
  const libScriptPath = join(libPath, 'libDesc.js')
  const libMinScriptPath = join(libPath, 'libDesc.min.js')

  parLibInPathLog(
    `>>>
    ${inspect({ name, version })}
    ${mainPath} --> ${libScriptPath}
    ` + (mainPathMin !== null ? mainPathMin + ' --> ' + libMinScriptPath : ''))

  if (await pathExists(mainPath)) {
    if (!await pathExists(libScriptPath)) {
      await copy(mainPath, libScriptPath)
    }
    const script = await readFile(libScriptPath, 'utf-8')
    await myWriteJSON({
      file: join(libPath, 'libDesc.sig.json'),
      content: await extractStructure({ content: script })
    })
  }
  if (mainPathMin !== null && await pathExists(mainPathMin)) {
    if (!await pathExists(libMinScriptPath)) {
      await copy(mainPathMin, libMinScriptPath)
    }
    const script = await readFile(libMinScriptPath, 'utf-8')
    await myWriteJSON({
      file: join(libPath, 'libDesc.min.sig.json'),
      content: await extractStructure({ content: script }),
    })
  }
}

export async function getNamesVersions(libsPath: string): Promise<libDesc[]> {
  const libs = await readdir(libsPath)
  return await libs.reduce(async (acc, lib) => {
    const versions = await readdir(join(libsPath, lib))
    const libVers = versions.map((version) => ({ name: lib, version }));
    return (await acc).concat(libVers)
  }, <Promise<libDesc[]>> Promise.resolve([]))
}

export function extractNameVersionFromFilename(filename: string): libDesc | null {
  const nameVersionRegex = /(.*)-(\d+\.\d+\.\d+.*)\.tgz/
  const match = nameVersionRegex.exec(filename)
  if (match === null) {
    return null
  }
  return { name: match[1], version: match[2] }
}

export async function parseLibraries({ libsPath }: { libsPath: string }) {
  const libVer = await getNamesVersions(libsPath)
  const libSignaturesParsed = libVer.map((lib) => {
    return async () => parseLibraryInPath({ libsPath, libDesc: lib })
  })
  const content = await resolveParallelGroups(chunk(libSignaturesParsed, 10))
}

export async function extractSingleLibraryFromDump({
  dumpPath,
  libsPath,
  filename,
  opts: {
    conservative = true,
  } = {}
}: {
  dumpPath: string,
  libsPath: string,
  filename: string,
  opts?: opts,
}): Promise<libDesc> {

  const libDesc = extractNameVersionFromFilename(filename)
  if (libDesc === null) {
    throw new Error('couldn\'t parse filename')
  }
  const { name, version } = libDesc

  const src = join(dumpPath, filename)
  const destDir = join(libsPath, name, version)
  const destFile = join(destDir, filename)
  const extrFile = join(destDir, 'package')

  await ensureDir(destDir)
  let destFileExists
  let extrFileExists
  if (!conservative) {
    await Promise.all([remove(destFile), remove(extrFile)])
    destFileExists = false
    extrFileExists = false
  }
  else {
    [destFileExists, extrFileExists] = await Promise.all([
      pathExists(destFile),
      pathExists(extrFile),
    ])
  }

  if (!destFileExists) {
    await move(src, destFile)
  }
  else {
    await remove(src)
  }
  if (!extrFileExists) {
    await tgzUnpack(destFile)
  }

  return libDesc
}
