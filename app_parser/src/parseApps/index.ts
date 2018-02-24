import { opts } from '../utils'

export type IsAppTypeFn = (p: { appPath: string }) => Promise<boolean>

export type AppsFolderParserFn = (
  p: { allAppsPath: string; libsPath: string },
  opts?: opts,
) => Promise<any>

export type AppParserFn = (p: { appPath: string; libsPath: string }, opts?: opts) => Promise<any>

export * from './getters'
export * from './cordova'
export * from './react-native'
