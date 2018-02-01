import { copy, ensureDir, move, pathExists, readdir, readFile, readJSON, remove } from 'fs-extra'
import { basename, dirname, extname, join, relative, resolve } from 'path'
import { inspect } from 'util'
import { extractFunctionStructure } from './extractStructure'
import {
  chunk,
  leftPad,
  opts,
  resolveAllOrInParallel,
  resolveParallelGroups,
  tgzUnpack
} from './utils'
import { fileDesc, fileDescOp, fileOp, myWriteJSON } from './utils/files'
import debug = require('debug')


export type libDesc = {
  name: string,
  version: string,
}

enum PKG_TYPE {
  bower,
  npm,
  component,
  guessed,
}

function extractNameVersionFromFilename(filename: string): libDesc | null {
  const nameVersionRegex = /(.*)-(\d+\.\d+\.\d+.*)\.tgz/
  const match = nameVersionRegex.exec(filename)
  if (match === null) {
    return null
  }
  return { name: match[1], version: match[2] }
}

/**
 * Spec is available at {@link https://github.com/bower/spec/blob/master/json.md}
 */
async function tryAsBowerPkg(
  pkgPath: string, { log }: opts = {}): Promise<string[] | null> {

  const bowerJsonPath = join(pkgPath, 'bower.json')
  let bowerJSON
  try {
    bowerJSON = await readJSON(bowerJsonPath)
  }
  catch (err) {
    if (log) {
      log('failed to read bower.json:\n%O', err)
    }
    return null
  }

  const main: string | string[] | void = bowerJSON.main

  if (!main) {
    return null
  }

  if (typeof main === 'string') {
    return extname(main) === '.js' ? [main] : null
  }

  const mainJs = main
    .filter((item) => extname(item) === '.js')

  return mainJs.length ? mainJs : null
}

/**
 * Spec is available at
 * {@link https://github.com/componentjs/spec/blob/master/component.json/specifications.md}
 */
async function tryAsComponentJsPkg(
  pkgPath: string,
  { log }: opts = {}): Promise<string[] | null> {

  const componentJsonPath = join(pkgPath, 'component.json')
  let componentJSON
  try {
    componentJSON = await readJSON(componentJsonPath)
  }
  catch (err) {
    if (log) {
      log('failed to read component.json:\n%O', err)
    }
    return null
  }

  const main: string | string[] | void = componentJSON.scripts

  if (!main) {
    return null
  }

  if (typeof main === 'string') {
    return extname(main) === '.js' ? [main] : null
  }

  const mainJs = main
    .filter((item) => extname(item) === '.js')

  return mainJs.length ? mainJs : null
}

/**
 * Spec is available at {@link https://nodejs.org/api/modules.html#modules_all_together}
 */
async function tryAsNodePkg(
  pkgPath: string,
  { log }: opts = {}): Promise<string[] | null> {

  const absolutePkgPath = resolve(process.cwd(), pkgPath)
  let mainPath: string
  try {
    mainPath = require.resolve(absolutePkgPath)
  }
  catch (err) {
    if (log) {
      log('require.resolve failed to load main file:\n%O', err)
    }
    return null
  }

  return [relative(absolutePkgPath, mainPath)]
}

/**
 * Guessing the main filename based on the file structure of the package:
 *    1. try 'dist/<pkgName>.js'
 *    2. try 'dist/<pkgName>-<pkgVer>.js'
 *    3. try '<pkgName>.js'
 *    4. try '<pkgName>-<pkgVer>.js'
 *
 * Minified versions of these files are tried outside of this function, in the parent function.
 */
async function tryAsGuessedPkg(
  pkgPath: string,
  { name, version }: libDesc,
  { log }: opts = {}): Promise<string[] | null> {

  return [
    `dist/${name}.js`,
    `dist/${name}-${version}.js`,
    `${name}.js`,
    `${name}-${version}.js`,
  ]
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

export async function extractMainFiles(
  { libsPath, name, version }: { libsPath: string } & libDesc,
  { conservative = true }: opts = {}): Promise<fileDescOp[]> {

  const libPath = join(libsPath, name, version)
  const libPackageP = join(libPath, 'package')
  const libMainP = join(libPath, 'mains')

  if (conservative && await pathExists(libMainP)) {
    return (await readdir(libMainP))
      .sort()
      .map((f): fileDescOp => ({
        type: fileOp.noop,
        cwd: libPath,
        dst: join('mains', f),
        conservative,
      }))
  }

  let potentialMainFiles = await tryAsBowerPkg(libPackageP)
  let solvedWith = PKG_TYPE.bower
  if (potentialMainFiles === null) {
    potentialMainFiles = await tryAsComponentJsPkg(libPackageP)
    solvedWith = PKG_TYPE.component
  }
  if (potentialMainFiles === null) {
    potentialMainFiles = await tryAsNodePkg(libPackageP)
    solvedWith = PKG_TYPE.npm
  }
  if (potentialMainFiles === null) {
    potentialMainFiles = await tryAsGuessedPkg(libPackageP, { name, version })
    solvedWith = PKG_TYPE.guessed
  }
  if (potentialMainFiles === null) {
    return []
  }

  const existingMainFilesLazy = potentialMainFiles
    .map((file) => join('package', file))
    .reduce((acc, item) => {
      acc = acc.concat(item)
      const minJs = getMinJs(item)
      if (minJs) {
        return acc.concat(minJs)
      }
      return acc
    }, <string[]>[])
    .map(async (item) => await pathExists(join(libPath, item)) ? item : '')

  return (await Promise.all(existingMainFilesLazy))
    .filter((el) => !!el)
    .map((src, i): fileDescOp => ({
      type: fileOp.copy,
      cwd: libPath,
      src,
      dst: `mains/${leftPad(i)}.js`,
      conservative,
    }))
}

async function analyseOneLibFile(
  { file, i }: { file: fileDesc, i: number },
  { conservative = true }: opts): Promise<fileDescOp> {

  const { cwd, dst } = file
  const destSig = `sigs/${leftPad(i)}.json`
  const fileP = join(cwd, dst)
  const content = await readFile(fileP, 'utf-8')
  const signature = await extractFunctionStructure({ content })

  return { type: fileOp.json, cwd, dst: destSig, json: signature, conservative }
}

export async function analyseLibFiles(
  files: fileDesc | fileDesc[],
  {
    chunkLimit,
    chunkSize,
    conservative = true,
  }: opts = {}): Promise<fileDescOp[]> {

  if (!Array.isArray(files)) {
    return [await analyseOneLibFile({ file: files, i: 0 }, { conservative })]
  }

  if (!files.length) {
    return []
  }

  let lazySaved = files.map((file, i) => {
    return async () => analyseOneLibFile({ file, i }, { conservative })
  })
  return await resolveAllOrInParallel(lazySaved, { chunkLimit, chunkSize })
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

  return { name, version }
}

export async function getVersions(libsPath: string, name: string): Promise<libDesc[]> {
  const versions = await readdir(join(libsPath, name))
  return versions.map((version) => ({ name, version }))
}



/*
 * OLD API
 */


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

async function parseLibraryInPath(
  { libsPath, name, version }: { libsPath: string } & libDesc) {

  const libPath = join(libsPath, name, version)
  const pkgPath = resolve(process.cwd(), libPath, 'package')

  const mainPath = await extractFromNpmPackage(pkgPath)

  if (mainPath === null) {
    return
  }

  const mainPathMin = getMinJs(mainPath)
  const libScriptPath = join(libPath, 'libDesc.js')
  const libMinScriptPath = join(libPath, 'libDesc.min.js')

  const parLibInPathLog = debug(`parLibInPath`)
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
      content: await extractFunctionStructure({ content: script })
    })
  }
  if (mainPathMin !== null && await pathExists(mainPathMin)) {
    if (!await pathExists(libMinScriptPath)) {
      await copy(mainPathMin, libMinScriptPath)
    }
    const script = await readFile(libMinScriptPath, 'utf-8')
    await myWriteJSON({
      file: join(libPath, 'libDesc.min.sig.json'),
      content: await extractFunctionStructure({ content: script }),
    })
  }
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

export async function parseLibraries({ libsPath }: { libsPath: string }) {
  const libVer = await getNamesVersions(libsPath)
  const libSignaturesParsed = libVer.map(({ name, version }) => {
    return async () => parseLibraryInPath({ libsPath, name, version })
  })
  const content = await resolveParallelGroups(chunk(libSignaturesParsed, 10))
}
