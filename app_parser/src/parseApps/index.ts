import { isNumber, isPlainObject } from 'lodash'
import { opts } from '../utils'

export type IsAppTypeFn = (p: { appPath: string }) => Promise<boolean>

export type AppsFolderParserFn = (
  p: { allAppsPath: string; libsPath: string },
  opts?: opts,
) => Promise<any>

export type AppParserFn = (p: { appPath: string; libsPath: string }, opts?: opts) => Promise<any>

export interface AppAnalysisReport {
  totalFiles: number
  noCandidates: number
}

export const isAppAnalysisReport = (o: any): o is AppAnalysisReport => {
  return (
    isPlainObject(o) &&
    'totalFiles' in o &&
    isNumber(o.totalFiles) &&
    'noCandidates' in o &&
    isNumber(o.noCandidates)
  )
}

export interface CordovaAnalysisReport extends AppAnalysisReport {
  totalFilesPerLocation: { [x: string]: number }
  noCandidatesPerLocation: { [x: string]: string[] }
}

export const isCordovaAnalysisReport = (o: any): o is CordovaAnalysisReport => {
  return (
    'totalFilesPerLocation' in o &&
    isPlainObject(o.totalFilesPerLocation) &&
    'noCandidatesPerLocation' in o &&
    isPlainObject(o.noCandidatesPerLocation) &&
    isAppAnalysisReport(o)
  )
}

export interface ReactNativeAnalysisReport extends AppAnalysisReport {}

export const isReactNativeAnalysisReport = (o: any): o is ReactNativeAnalysisReport => {
  return isAppAnalysisReport(o)
}

export * from './getters'
export * from './cordova'
export * from './react-native'
