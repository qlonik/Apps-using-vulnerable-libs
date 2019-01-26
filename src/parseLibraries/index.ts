import { ensureDir, move, pathExists, readdir, readFile, readJSON, remove } from 'fs-extra'
import { basename, dirname, extname, join, relative, resolve } from 'path'
import { lock } from 'proper-lockfile'
import { extractStructure, LiteralSignature } from '../extractStructure'
import { union } from '../similarityIndex/set'
import { leftPad, opts, resolveAllOrInParallel, tgzUnpack } from '../utils'
import { fileDesc, fileDescOp, fileOp, saveFiles } from '../utils/files'
import { LIB_LITERAL_SIGNATURE_FILE } from './constants'
import { getLibNameVersionSigContents, libNameVersion, libPath } from './getters'

export * from './getters'

enum PKG_TYPE {
  bower,
  npm,
  component,
  guessed,
}

export function extractNameVersionFromFilename(filename: string): libNameVersion | null {
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
async function tryAsBowerPkg(pkgPath: string, { log }: opts = {}): Promise<string[] | null> {
  const bowerJsonPath = join(pkgPath, 'bower.json')
  let bowerJSON
  try {
    bowerJSON = await readJSON(bowerJsonPath)
  } catch (err) {
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

  const mainJs = main.filter((item) => extname(item) === '.js')

  return mainJs.length > 0 ? mainJs : null
}

/**
 * Spec is available at
 * {@link https://github.com/componentjs/spec/blob/master/component.json/specifications.md}
 */
async function tryAsComponentJsPkg(pkgPath: string, { log }: opts = {}): Promise<string[] | null> {
  const componentJsonPath = join(pkgPath, 'component.json')
  let componentJSON
  try {
    componentJSON = await readJSON(componentJsonPath)
  } catch (err) {
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

  const mainJs = main.filter((item) => extname(item) === '.js')

  return mainJs.length > 0 ? mainJs : null
}

/**
 * Spec is available at {@link https://nodejs.org/api/modules.html#modules_all_together}
 */
async function tryAsNodePkg(pkgPath: string, { log }: opts = {}): Promise<string[] | null> {
  const absolutePkgPath = resolve(process.cwd(), pkgPath)
  let mainPath: string
  try {
    mainPath = require.resolve(absolutePkgPath)
  } catch (err) {
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
  { name, version }: libNameVersion,
): Promise<string[] | null> {
  return [`dist/${name}.js`, `dist/${name}-${version}.js`, `${name}.js`, `${name}-${version}.js`]
}

async function getPotentialMainFiles(pkgPath: string, nv: libNameVersion, o: opts = {}) {
  let main = await tryAsBowerPkg(pkgPath, o)
  let pkgType = PKG_TYPE.bower
  if (main === null) {
    main = await tryAsComponentJsPkg(pkgPath, o)
    pkgType = PKG_TYPE.component
  }
  if (main === null) {
    main = await tryAsNodePkg(pkgPath, o)
    pkgType = PKG_TYPE.npm
  }
  if (main === null) {
    main = await tryAsGuessedPkg(pkgPath, nv)
    pkgType = PKG_TYPE.guessed
  }

  return main === null ? { main: [] as string[], pkgType: null } : { main, pkgType }
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
  { libsPath, name, version }: { libsPath: string } & libNameVersion,
  { conservative = true }: opts = {},
): Promise<fileDescOp[]> {
  const libPath = join(libsPath, name, version)
  const libPackageP = join(libPath, 'package')
  const libMainP = join(libPath, 'mains')

  if (conservative && (await pathExists(libMainP))) {
    return (await readdir(libMainP)).sort().map(
      (f): fileDescOp => ({
        type: fileOp.noop,
        cwd: libPath,
        dst: join('mains', f),
        conservative,
      }),
    )
  }

  const { main: potentialMainFiles } = await getPotentialMainFiles(libPackageP, { name, version })

  const existingMainFilesLazy = potentialMainFiles
    .map((file) => join('package', file))
    .reduce(
      (acc, item) => {
        acc = acc.concat(item)
        const minJs = getMinJs(item)
        if (minJs) {
          return acc.concat(minJs)
        }
        return acc
      },
      [] as string[],
    )
    .map(async (item) => ((await pathExists(join(libPath, item))) ? item : ''))

  return (await Promise.all(existingMainFilesLazy))
    .filter((el) => !!el)
    .map(
      (src, i): fileDescOp => ({
        type: fileOp.copy,
        cwd: libPath,
        src,
        dst: `mains/${leftPad(i)}.js`,
        conservative,
      }),
    )
}

async function analyseOneLibFile(
  { file, i }: { file: fileDesc; i: number },
  { conservative = true, extractorOpts }: opts,
): Promise<fileDescOp> {
  const { cwd, dst } = file
  const destSig = `sigs/${leftPad(i)}.json`
  const fileP = join(cwd, dst)
  const content = await readFile(fileP, 'utf-8')
  const signature = await extractStructure({ content, options: extractorOpts })

  return { type: fileOp.json, cwd, dst: destSig, json: signature, conservative }
}

export async function analyseLibFiles(
  files: fileDesc | fileDesc[],
  { chunkLimit, chunkSize, conservative = true, extractorOpts }: opts = {},
): Promise<fileDescOp[]> {
  if (!Array.isArray(files)) {
    return [await analyseOneLibFile({ file: files, i: 0 }, { conservative, extractorOpts })]
  }

  if (files.length === 0) {
    return []
  }

  let lazySaved = files.map((file, i) => {
    return async () => analyseOneLibFile({ file, i }, { conservative, extractorOpts })
  })
  return await resolveAllOrInParallel(lazySaved, { chunkLimit, chunkSize })
}

export async function extractSingleLibraryFromDump({
  dumpPath,
  libsPath,
  filename,
  opts: { conservative = true } = {},
}: {
  dumpPath: string
  libsPath: string
  filename: string
  opts?: opts
}): Promise<libNameVersion> {
  const libDesc = extractNameVersionFromFilename(filename)
  if (libDesc === null) {
    throw new Error("couldn't parse filename")
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
  } else {
    const [destFileExistsL, extrFileExistsL] = await Promise.all([
      pathExists(destFile),
      pathExists(extrFile),
    ])
    destFileExists = destFileExistsL
    extrFileExists = extrFileExistsL
  }

  if (!extrFileExists) {
    await tgzUnpack(src, destDir)
  }
  if (!destFileExists) {
    await move(src, destFile)
  } else {
    await remove(src)
  }

  return { name, version }
}

export async function updateUnionLiteralSignature(
  { libsPath, name, version }: { libsPath: string; name: string; version?: string },
  o: opts = {},
): Promise<void> {
  const sigs = await getLibNameVersionSigContents(libsPath, name, version)
  const libraryPath = libPath(libsPath, name)
  const litSigPath = join(libraryPath, LIB_LITERAL_SIGNATURE_FILE)
  const release = await lock(libraryPath, { retries: 10 })

  const libLitSigPrevContent = (await pathExists(litSigPath)) ? await readJSON(litSigPath) : []
  const libLitSig: Set<LiteralSignature> = new Set(libLitSigPrevContent)

  const libLitSigUpd = sigs.reduce((acc, { signature: { literalSignature } }) => {
    const currentLibLiteralSigSet = new Set(literalSignature)
    return union(acc, currentLibLiteralSigSet)
  }, libLitSig)

  const saveContent: fileDescOp = {
    cwd: libraryPath,
    dst: LIB_LITERAL_SIGNATURE_FILE,
    conservative: false,
    type: fileOp.json,
    json: [...libLitSigUpd],
  }
  await saveFiles(saveContent)
  return await release()
}
