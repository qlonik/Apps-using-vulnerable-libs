import { mkdirp, pathExists, readFile } from 'fs-extra'
import { isString } from 'lodash'
import { join } from 'path'
import { extractReactNativeStructure } from '../extractStructure'
import { getCandidateLibs } from '../similarityIndex'
import { union } from '../similarityIndex/set'
import { opts, resolveAllOrInParallel } from '../utils'
import { fileDescOp, fileOp, saveFiles } from '../utils/files'
import {
  ANALYSIS_FOLDER,
  REACT_NATIVE_CAND_FILE,
  REACT_NATIVE_MAIN_FILE,
  REACT_NATIVE_SIG_FILE,
} from './constants'
import { appDesc } from './getters'
import { IsAppTypeFn } from './index'

export const isReactNativeApp: IsAppTypeFn = async function({ appPath }): Promise<boolean> {
  const bundlePath = [appPath, 'assets', 'index.android.bundle']
  return await pathExists(join(...bundlePath))
}

export const preprocessReactNativeApp = async (
  {
    allAppsPath,
    appsAnalysisPath = allAppsPath,
    allLibsPath,
    app: { type, section, app },
  }: {
    allAppsPath: string
    appsAnalysisPath?: string
    allLibsPath?: string
    app: appDesc
  },
  { conservative = false, extractorOpts }: opts = {},
) => {
  const bundlePath = join(allAppsPath, type, section, app, REACT_NATIVE_MAIN_FILE)
  const bundleContent = await readFile(bundlePath, 'utf-8')
  const parsedBundle = await extractReactNativeStructure({
    content: bundleContent,
    options: extractorOpts,
  })

  const jsAnalysisPath = join(appsAnalysisPath, type, section, app, ANALYSIS_FOLDER)
  await mkdirp(jsAnalysisPath)

  const lazy = parsedBundle.map(({ id, functionSignature, literalSignature }) => async () => {
    const cwd = join(jsAnalysisPath, isString(id) ? `s_${id}` : `n_${id}`)
    const ops = [
      {
        cwd,
        dst: REACT_NATIVE_SIG_FILE,
        type: fileOp.json,
        json: { functionSignature, literalSignature },
        conservative,
      },
    ] as fileDescOp[]

    if (allLibsPath) {
      const fileCandidate = await getCandidateLibs({
        signature: { literalSignature },
        libsPath: allLibsPath,
        opts: { limit: 10 },
      })
      ops.push({
        cwd,
        dst: REACT_NATIVE_CAND_FILE,
        type: fileOp.json,
        json: fileCandidate,
        conservative,
      })
    }

    await saveFiles(ops)
  })

  if (allLibsPath) {
    const totalLitSig = parsedBundle.reduce((acc, { literalSignature }) => {
      return union(acc, new Set(literalSignature))
    }, new Set())
    const signature = { literalSignature: [...totalLitSig.values()] }
    const candidates = getCandidateLibs({ signature, libsPath: allLibsPath, opts: { limit: 50 } })
    await saveFiles({
      cwd: jsAnalysisPath,
      dst: REACT_NATIVE_CAND_FILE,
      type: fileOp.json,
      json: candidates,
      conservative,
    })
  }

  return await resolveAllOrInParallel(lazy)
}
