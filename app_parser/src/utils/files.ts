import { copy, ensureDir, move, pathExists, writeFile, writeJSON } from 'fs-extra'
import { dirname, join, resolve } from 'path'
import { assertNever, opts, resolveAllOrInParallel } from './index'


export type fileDesc = {
  cwd: string,
  dst: string,
}

export enum fileOp {
  copy = 'copy',
  move = 'move',
  text = 'text',
  json = 'json',
  noop = 'noop',
}

export type fileDescOp = fileDesc & {
  // opts
  conservative: boolean,
} & ({
  type: fileOp.copy | fileOp.move,
  src: string,
} | {
  type: fileOp.text,
  text: string,
} | {
  type: fileOp.json,
  json: any,
} | {
  type: fileOp.noop,
})

export const myWriteJSON = async function (
  { content, file, opts = { spaces: 2 } }: { content: object, file: string, opts?: any }) {

  if (opts && !opts.spaces) {
    opts.spaces = 2
  }
  return await writeJSON(file, content, opts)
}

const saveOneFile = async (fileDesc: fileDescOp): Promise<fileDesc> => {

  const { cwd, dst } = fileDesc
  const dest = resolve(cwd, dst)
  if (!fileDesc.type
      || (fileDesc.type === fileOp.noop)
      || (fileDesc.conservative && await pathExists(dest))) {

    return { cwd, dst }
  }
  await ensureDir(dirname(dest))
  if (fileDesc.type === fileOp.json) {
    const { json } = fileDesc
    await myWriteJSON({ content: json, file: dest })
  }
  else if (fileDesc.type === fileOp.text) {
    const { text } = fileDesc
    await writeFile(dest, text)
  }
  else if (fileDesc.type === fileOp.copy
           || fileDesc.type === fileOp.move) {

    let operation: (src: string, dest: string, opts?: object) => Promise<void> = copy
    if (fileDesc.type === fileOp.copy) {
      operation = copy
    }
    else if (fileDesc.type === fileOp.move) {
      operation = move
    }
    const src = resolve(cwd, fileDesc.src)
    await operation(src, dest)
  }
  else {
    assertNever(fileDesc.type)
  }

  return { cwd, dst }
}

export async function saveFiles(
  files: fileDescOp | fileDescOp[] | Promise<fileDescOp> | Promise<fileDescOp[]>,
  {
    chunkLimit,
    chunkSize,
  }: opts = {}): Promise<fileDesc[]> {

  files = await files

  if (!Array.isArray(files)) {
    return [await saveOneFile(files)]
  }

  if (!files.length) {
    return []
  }

  const lazyFilesSaved = files.map((file) => {
    return async () => saveOneFile(file)
  })
  return await resolveAllOrInParallel(lazyFilesSaved, { chunkLimit, chunkSize })
}
