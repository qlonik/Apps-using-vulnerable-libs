import { pathExists, readdir } from 'fs-extra'
import { flatten } from 'lodash'
import { join } from 'path'
import { resolveAllOrInParallel } from '../utils'

export enum APP_TYPES {
  cordova = 'cordova',
  reactNative = 'react-native',
}

export type appDesc = {
  type: APP_TYPES
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
