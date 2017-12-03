import { ensureDir, move, readdir } from 'fs-extra'
import { join } from 'path'
import { opts, resolveAllOrInParallel } from '../utils'


export const LIMIT_SIMILARITIES = 100

export interface AppDescription {
  section: string,
  app: string,
}

export interface IsAppTypeFn {
  (p: { allAppsPath: string, appDesc: AppDescription }): Promise<boolean>,
}

export interface MoveAppTypeFn {
  (p: { appTypePath: string, allAppsPath: string }, opts?: opts): Promise<any>,
}

export interface AppsFolderParserFn {
  (p: { allAppsPath: string, libsPath: string }, opts?: opts): Promise<any>,
}

export interface AppParserFn {
  (p: { appPath: string, libsPath: string }, opts?: opts): Promise<any>,
}

export async function getAppsAndSections(
  { allAppsPath }: { allAppsPath: string }): Promise<AppDescription[]> {

  const appSections = await readdir(allAppsPath)
  const appsNonFlat = await Promise.all(appSections.map(async (appSection) => {
    const apps = await readdir(join(allAppsPath, appSection))
    return apps.map((app) => ({ section: appSection, app }))
  }))
  return (<AppDescription[]>[]).concat(...appsNonFlat)
}

export const appsReformat = async function (
  { allAppsPath }: { allAppsPath: string },
  { chunkLimit = 10, chunkSize = 5 }: opts = {}) {

  const appSections = await getAppsAndSections({ allAppsPath })

  const pr = appSections.map(({ section, app }) => async () => {
    const appPath = join(allAppsPath, section, app)
    const dest = join(appPath, 'apktool.decomp')
    await ensureDir(dest)
    const files = (await readdir(appPath)).filter((file) => file !== 'apktool.decomp')
    await Promise.all(files.map(async (file) => {
      await move(join(appPath, file), join(dest, file))
    }))
  })

  return await resolveAllOrInParallel(pr, { chunkLimit, chunkSize })
}

export * from './cordova'
export * from './react-native'
