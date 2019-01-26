import { random } from 'lodash'
import { join } from 'path'
import { FunctionSignature } from '../../extractStructure'
import {
  analysisFile,
  APP_TYPES,
  appDesc,
  getAnalysedData,
  getApps,
  getCordovaAnalysisFiles,
  getReactNativeAnalysisFiles,
} from '../../parseApps'
import { assertNever } from '../../utils'
import { myWriteJSON } from '../../utils/files'
import { MainFn } from '../_all.types'

const RND_NUM = 500

type appFileFnSig = {
  app: appDesc
  file: analysisFile
  signature: FunctionSignature
}

export const environment = {
  APPS_PATH: {},
}

export const main: MainFn<typeof environment> = async function main(log, { OUT, APPS_PATH }) {
  const apps = (await getApps(APPS_PATH, APP_TYPES.cordova)).filter(
    (app) => app.section !== 'f-droid',
  )
  const sigs = await apps.reduce(async (acc, app) => {
    const awaited = await acc

    const fn: (path: string, app: appDesc) => Promise<analysisFile[]> =
      app.type === APP_TYPES.cordova
        ? getCordovaAnalysisFiles
        : app.type === APP_TYPES.reactNative
        ? getReactNativeAnalysisFiles
        : assertNever(app.type)

    const sigs = await getAnalysedData(APPS_PATH, app, await fn(APPS_PATH, app))
    return awaited.concat(
      sigs
        .map(({ file, signature }) => ({
          file,
          signatures: (signature && signature.functionSignature) || [],
        }))
        .reduce(
          (acc, { file, signatures }) => {
            return acc.concat(signatures.map((signature) => ({ app, file, signature: signature })))
          },
          [] as appFileFnSig[],
        ),
    )
  }, Promise.resolve([] as appFileFnSig[]))

  log.info({ fns: sigs.length }, 'number of functions across all apps')

  let picked: appFileFnSig[] = []
  for (let i = 0; i < RND_NUM; i++) {
    picked = picked.concat(sigs.splice(random(sigs.length - 1), 1))
  }

  await myWriteJSON({ content: picked, file: join(OUT, 'picked.json') })
}
