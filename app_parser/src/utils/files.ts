import { copy, ensureDir, move, pathExists, writeFile, writeJSON } from 'fs-extra'
import { dirname, join } from 'path';
import { opts, resolveAllOrInParallel } from './index'


export type fileDesc = {
  cwd: string,
  dst: string,
}
export type fileDescOp = fileDesc & ({
  type: 'copy' | 'move',
  src: string,
} | {
  type: 'text',
  text: string,
} | {
  type: 'json',
  json: object,
})

export const myWriteJSON = async function (
  { content, file, opts = { spaces: 2 } }: { content: object, file: string, opts?: any }) {

  if (opts && !opts.spaces) {
    opts.spaces = 2
  }
  return await writeJSON(file, content, opts)
}

const saveOneFile = async (
  fileDesc: fileDescOp,
  {
    conservative = true,
  }: opts = {}): Promise<fileDesc> => {

  const { cwd, dst } = fileDesc
  if (!fileDesc.type) {
    return { cwd, dst }
  }
  const dest = join(cwd, dst)
  const destExists = conservative && await pathExists(dest)
  if (destExists) {
    return { cwd, dst }
  }

  const destDir = dirname(dest)
  await ensureDir(destDir)

  if (fileDesc.type === 'json') {
    const { json } = fileDesc
    await myWriteJSON({ content: json, file: dest })
  }
  else if (fileDesc.type === 'text') {
    const { text } = fileDesc
    await writeFile(dest, text)
  }
  else if ((fileDesc.type === 'copy' || fileDesc.type === 'move')) {
    const { src } = fileDesc
    const sorc = join(cwd, src)

    let operation: (src: string, dest: string, opts?: object) => Promise<void> = copy
    switch (fileDesc.type) {
      case 'copy':
        operation = copy
        break
      case 'move':
        operation = move
        break
    }

    await operation(sorc, dest)
  }

  return { cwd, dst }
}

export async function saveFiles(
  files: fileDescOp | fileDescOp[] | Promise<fileDescOp> | Promise<fileDescOp[]>,
  {
    conservative = true,
    chunkLimit,
    chunkSize,
  }: opts = {}): Promise<fileDesc[]> {

  files = await files

  if (!Array.isArray(files)) {
    return [await saveOneFile(files, { conservative })]
  }

  if (!files.length) {
    return []
  }

  const lazyFilesSaved = files.map((file) => {
    return async () => saveOneFile(file, { conservative })
  })
  return await resolveAllOrInParallel(lazyFilesSaved, { chunkLimit, chunkSize })
}
