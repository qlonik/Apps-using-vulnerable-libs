import { pathExists, readdir } from 'fs-extra'
import { flatten } from 'lodash'
import { join } from 'path'
import { assertNever, resolveAllOrInParallel } from '../utils'
import { ANALYSIS_FOLDER } from './constants'

export enum APP_TYPES {
  cordova = 'cordova',
  reactNative = 'react-native',
}

export type appDesc<T extends APP_TYPES = APP_TYPES> = {
  type: T
  section: string
  app: string
}

export function appPath(
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
}

export async function getApps(appsPath: string, type?: APP_TYPES): Promise<appDesc[]> {
  const appTypes = type
    ? [{ type }]
    : [{ type: APP_TYPES.cordova }, { type: APP_TYPES.reactNative }]

  const appSections = flatten(
    await resolveAllOrInParallel(
      appTypes.map(({ type }) => {
        return async () => {
          const typePath = join(appsPath, type)
          return (await pathExists(typePath))
            ? (await readdir(typePath)).map((section) => ({ type, section }))
            : []
        }
      }),
    ),
  )

  return flatten(
    await resolveAllOrInParallel(
      appSections.map(({ type, section }) => {
        return async () => {
          const sectionPath = join(appsPath, type, section)
          return (await pathExists(sectionPath))
            ? (await readdir(sectionPath)).map((app) => ({ type, section, app }))
            : []
        }
      }),
    ),
  )
}

export type analysisFile = { path: string }

export type cordovaAnalysisFile = analysisFile & { location: string; id: string }
export async function getCordovaAnalysisFiles(
  appsPath: string,
  app: appDesc,
): Promise<cordovaAnalysisFile[]> {
  if (app.type !== APP_TYPES.cordova) {
    throw new Error('wrong app type')
  }

  const analysisFolder = join(appPath(appsPath, app.type, app.section, app.app), ANALYSIS_FOLDER)
  const locations = (await readdir(analysisFolder)) as string[]
  const locationId = flatten(
    await resolveAllOrInParallel(
      locations.map((location) => async () => {
        return (await readdir(join(analysisFolder, location))).map((id) => ({ location, id }))
      }),
    ),
  )
  return locationId.map(({ location, id }) => ({ path: join(location, id), location, id }))
}

const reactNativeIdRegex = /(s|n)_.+/
export type reactNativeAnalysisFile = analysisFile &
  ({ idType: 'n'; id: number } | { idType: 's'; id: string })
export async function getReactNativeAnalysisFiles(
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
}
