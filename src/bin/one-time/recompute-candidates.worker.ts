import { join } from 'path'
import { worker } from 'workerpool'
import {
  APP_TYPES,
  appPath as appPathFn,
  getAnalysedData,
  getReactNativeAnalysisFiles,
} from '../../parseApps'
import { ANALYSIS_FOLDER, REACT_NATIVE_CAND_FILE } from '../../parseApps/constants'
import { getCandidateLibs } from '../../similarityIndex'
import { union } from '../../similarityIndex/set'
import { resolveAllOrInParallel } from '../../utils'
import { fileDescOp, fileOp, saveFiles } from '../../utils/files'
import { messages } from './recompute-candidates'

worker<messages>({
  'recompute-candidates': async ({ app, appsPath, libsPath }) => {
    if (app.type === APP_TYPES.cordova) {
      return null
    }

    if (app.type === APP_TYPES.reactNative) {
      const analysisPath = join(
        appPathFn(appsPath, app.type, app.section, app.app),
        ANALYSIS_FOLDER,
      )
      const analysisFiles = await getReactNativeAnalysisFiles(appsPath, app)
      const signatureFiles = await getAnalysedData(appsPath, app, analysisFiles)

      const things = await resolveAllOrInParallel(
        signatureFiles.map(({ file, signature }) => async () => {
          if (signature === null) {
            return null
          }

          const fileCandidate = await getCandidateLibs({
            signature,
            libsPath,
            opts: { limit: 10 },
          })
          return {
            file,
            signature,
            op: {
              cwd: join(analysisPath, file.path),
              dst: REACT_NATIVE_CAND_FILE,
              type: fileOp.json,
              json: fileCandidate,
              conservative: false,
            } as fileDescOp,
          }
        }),
      )

      const done = things.reduce(
        (acc, thing) => {
          return thing === null
            ? acc
            : {
                commonSig: union(acc.commonSig, new Set(thing.signature.literalSignature)),
                ops: acc.ops.concat(thing.op),
              }
        },
        { commonSig: new Set<string | number>(), ops: [] as fileDescOp[] },
      )

      const commonCand = await getCandidateLibs({
        signature: { literalSignature: [...done.commonSig] },
        libsPath,
        opts: { limit: 50 },
      })

      await saveFiles(
        done.ops.concat({
          cwd: analysisPath,
          dst: REACT_NATIVE_CAND_FILE,
          type: fileOp.json,
          json: commonCand,
          conservative: false,
        } as fileDescOp),
      )

      return true
    }

    return null
  },
})

process.on('SIGINT', () => {})
