import { pathExists } from 'fs-extra'
import { basename, dirname, extname, join } from 'path'
// eslint-disable-next-line no-unused-vars
import { MessagesMap, worker as workerpoolWorkerFn, WorkerFunctionsMap } from 'workerpool'

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

export const worker: typeof workerpoolWorkerFn = async <T extends MessagesMap>(
  methods: WorkerFunctionsMap<T>,
) => {
  workerpoolWorkerFn(methods)
}
