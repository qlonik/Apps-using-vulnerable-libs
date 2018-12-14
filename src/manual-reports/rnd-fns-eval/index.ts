import { SourceLocation } from 'babel-types'
import { FunctionSignature } from '../../extractStructure'
import { APP_TYPES, appDesc, cordovaAnalysisFile } from '../../parseApps'
import { libNameVersionSigFile } from '../../parseLibraries'

export enum MisMatchedReason {
  not = 'function is not added yet',
  gone = 'function is gone',
  mod = 'function is modified',
  min = 'function is modified by minifier',
}

export type MatchedFn = libNameVersionSigFile & {
  index: number
  /** means this matched lib version is what is used in the library */
  targetVersion?: true
  loc?: SourceLocation
}
export type ModMisMatchedFn = libNameVersionSigFile & {
  reason: MisMatchedReason.mod | MisMatchedReason.min
  index: number
}
export type GoneMisMatchedFn = libNameVersionSigFile & {
  reason: MisMatchedReason.not | MisMatchedReason.gone
}
export type MisMatchedFn = ModMisMatchedFn | GoneMisMatchedFn

export type InAppFunction = {
  comments: string[]
  app: appDesc<APP_TYPES.cordova>
  file: cordovaAnalysisFile
  signature: FunctionSignature
}
export type TodoAppFunction = InAppFunction & {
  shouldSkip?: true
  matchedFns?: MatchedFn[]
  misMatchedFns?: MisMatchedFn[]
}
export type AppFunction = InAppFunction & {
  matchedFns: MatchedFn[]
  misMatchedFns: MisMatchedFn[]
}

export { data, noMisMatched } from './data'
