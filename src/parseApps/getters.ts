import { pathExists, readdir, readJSON } from 'fs-extra'
import { flatten, memoize, MemoizedFunction } from 'lodash' // eslint-disable-line no-unused-vars
import { join } from 'path'
import { signatureWithComments } from '../extractStructure'
import { indexValue } from '../similarityIndex/set'
import { assertNever, resolveAllOrInParallel } from '../utils'
import {
  ANALYSIS_FOLDER,
  CORDOVA_CAND_FILE,
  CORDOVA_SIG_FILE,
  CORDOVA_SIM_FILE,
  REACT_NATIVE_CAND_FILE,
  REACT_NATIVE_SIG_FILE,
  REACT_NATIVE_SIM_FILE,
} from './constants'
import { BundleSimFnReturn } from '../similarityIndex'

export enum APP_TYPES {
  cordova = 'cordova',
  reactNative = 'react-native',
}

export type appDesc<T extends APP_TYPES = APP_TYPES> = {
  type: T
  section: string
  app: string
}

export const appPath = memoize(function _appPath(
  appsPath: string,
  type?: APP_TYPES,
  section?: string,
  name?: string,
): string {
  let path = appsPath
  if (type) {
    path = join(path, type)
  }
  if (section) {
    path = join(path, section)
  }
  if (name) {
    path = join(path, name)
  }
  return path
},
(appsPath: string, type: keyof typeof APP_TYPES | '' = '', section = '', name = '') => `${appsPath}/${type}/${section}/${name}`)

export const getApps = memoize(async function _getApps(
  appsPath: string,
  type?: APP_TYPES,
): Promise<appDesc[]> {
  const appTypes = type ? [type] : [APP_TYPES.cordova, APP_TYPES.reactNative]
  return appTypes.reduce(async (acc, type) => {
    const typePath = join(appsPath, type)
    if (!await pathExists(typePath)) {
      return acc
    }
    return (await readdir(typePath))
      .filter((section) => !section.startsWith('_'))
      .reduce(async (acc, section) => {
        const sectionPath = join(typePath, section)
        if (!await pathExists(sectionPath)) {
          return acc
        }
        return (await acc).concat(
          (await readdir(sectionPath))
            .filter((app) => !app.startsWith('_'))
            .map((app) => ({ type, section, app })),
        )
      }, acc)
  }, Promise.resolve([] as appDesc[]))
},
(appsPath: string, type: keyof typeof APP_TYPES | '' = '') => `${appsPath}/${type}`)

export type analysisFile = { path: string }

export type cordovaAnalysisFile = analysisFile & { location: string; id: string }
export const isCordovaAnalysisFile = (f: analysisFile): f is cordovaAnalysisFile => {
  return 'location' in f && 'id' in f
}
export const getCordovaAnalysisFiles = memoize(async function _getCordovaAnalysisFiles(
  appsPath: string,
  app: appDesc,
): Promise<cordovaAnalysisFile[]> {
  if (app.type !== APP_TYPES.cordova) {
    throw new Error('wrong app type')
  }

  const analysisFolder = join(appPath(appsPath, app.type, app.section, app.app), ANALYSIS_FOLDER)
  const locations = (await readdir(analysisFolder)) as string[]
  const nonFlatLocationId = await resolveAllOrInParallel(
    locations.filter((location) => !location.startsWith('_')).map((location) => async () => {
      return (await readdir(join(analysisFolder, location))).map((id) => ({ location, id }))
    }),
  )
  const locationId = flatten(nonFlatLocationId)
  return locationId
    .filter(({ id }) => !id.startsWith('_'))
    .map(({ location, id }) => ({ path: join(location, id), location, id }))
},
(appsPath: string, { type, section, app }: appDesc) => `${appsPath}/${type}/${section}/${app}`)

const reactNativeIdRegex = /(s|n)_.+/
export type reactNativeAnalysisFile = analysisFile &
  ({ idType: 'n'; id: number } | { idType: 's'; id: string })
export const isReactNativeAnalysisFile = (f: analysisFile): f is reactNativeAnalysisFile => {
  return 'idType' in f && 'id' in f
}
export const getReactNativeAnalysisFiles = memoize(async function _getReactNativeAnalysisFiles(
  appsPath: string,
  app: appDesc,
): Promise<reactNativeAnalysisFile[]> {
  if (app.type !== APP_TYPES.reactNative) {
    throw new Error('wrong app type')
  }

  const analysisFolder = join(appPath(appsPath, app.type, app.section, app.app), ANALYSIS_FOLDER)
  const ids = (await readdir(analysisFolder)) as string[]
  return ids.filter((id) => reactNativeIdRegex.test(id)).map((path) => {
    const [idType, idUnparsed] = path.split('_') as ['s' | 'n', string]
    if (idType === 's') {
      return { path, idType, id: idUnparsed }
    } else if (idType === 'n') {
      return { path, idType, id: parseInt(idUnparsed, 10) }
    } else {
      return assertNever(idType)
    }
  })
},
(appsPath: string, { type, section, app }: appDesc) => `${appsPath}/${type}/${section}/${app}`)

export const getAnalysisFiles = memoize(async function _getAnalysisFiles(
  appsPath: string,
  app: appDesc,
): Promise<analysisFile[]> {
  return app.type === APP_TYPES.cordova
    ? await getCordovaAnalysisFiles(appsPath, app)
    : app.type === APP_TYPES.reactNative
      ? await getReactNativeAnalysisFiles(appsPath, app)
      : assertNever(app.type)
},
(appsPath: string, { type, section, app }: appDesc) => `${appsPath}/${type}/${section}/${app}`)

export type analysedDataFile<T> = {
  file: T
  signature: signatureWithComments | null
  candidates: { name: string; index: indexValue }[] | null
  similarity: BundleSimFnReturn | null
}
/* eslint-disable import/export,typescript/no-use-before-define */
export async function getAnalysedData<T extends analysisFile>(
  appsPath: string,
  app: appDesc,
  files: T,
): Promise<analysedDataFile<T>>
export async function getAnalysedData<T extends analysisFile>(
  appsPath: string,
  app: appDesc,
  files: T[],
): Promise<analysedDataFile<T>[]>
export async function getAnalysedData<T extends analysisFile>(
  appsPath: string,
  app: appDesc,
  files: T | T[],
): Promise<analysedDataFile<T> | analysedDataFile<T>[]> {
  const filesArr: T[] = !Array.isArray(files) ? [files] : files

  const loadedFiles = await resolveAllOrInParallel(
    filesArr.map((file) => async () => {
      const fileArr =
        app.type === APP_TYPES.cordova
          ? [CORDOVA_SIG_FILE, CORDOVA_CAND_FILE, CORDOVA_SIM_FILE]
          : app.type === APP_TYPES.reactNative
            ? [REACT_NATIVE_SIG_FILE, REACT_NATIVE_CAND_FILE, REACT_NATIVE_SIM_FILE]
            : assertNever(app.type)

      const read = async (fileType: string) => {
        const path = join(
          appPath(appsPath, app.type, app.section, app.app),
          ANALYSIS_FOLDER,
          file.path,
          fileType,
        )
        return (await pathExists(path)) ? await readJSON(path) : null
      }
      const [signature, candidates, similarity] = await Promise.all(fileArr.map(read))
      return { file, signature, candidates, similarity }
    }),
  )

  return !Array.isArray(files) ? loadedFiles[0] : loadedFiles
}
/* eslint-enable import/export,typescript/no-use-before-define */
