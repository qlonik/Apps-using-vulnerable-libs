import { readdir } from 'fs-extra'
import { join } from 'path'
import { opts } from '../utils'


export interface AppDescription {
  section: string,
  app: string,
}

export type IsAppTypeFn =
  (p: { appPath: string }) => Promise<boolean>

export type AppsFolderParserFn =
  (p: { allAppsPath: string, libsPath: string }, opts?: opts) => Promise<any>

export type AppParserFn =
  (p: { appPath: string, libsPath: string }, opts?: opts) => Promise<any>


export async function getAppsAndSections(
  { allAppsPath }: { allAppsPath: string }): Promise<AppDescription[]> {

  const appSections = await readdir(allAppsPath)
  const appsNonFlat = await Promise.all(appSections.map(async (appSection) => {
    const apps = await readdir(join(allAppsPath, appSection))
    return apps.map((app) => ({ section: appSection, app }))
  }))
  return (<AppDescription[]>[]).concat(...appsNonFlat)
}


export * from './getters'
export * from './cordova'
export * from './react-native'
