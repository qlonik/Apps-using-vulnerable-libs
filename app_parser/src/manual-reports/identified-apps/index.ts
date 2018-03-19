import { APP_TYPES, appDesc } from '../../parseApps'
import { candidateLib, SimilarityToLibs } from '../../similarityIndex'

export type match = {
  name: string
  version?: string
  file?: string
  isGuess: boolean
  comments?: string
}
export type matchReport =
  | { type: 'unknown' | ''; match?: match | match[] }
  | { type: 'business-logic' }
  | { type: 'single-lib'; match: match }
  | { type: 'bundle'; match: match[] }
export type candidatesReport =
  | { candidateType: 'empty' }
  | { candidateType: 'subset'; candidates: string[] }
  | { candidateType: 'sll'; candidates: candidateLib[] }
export type CordovaManualAnalysisReport = {
  app: appDesc<APP_TYPES.cordova>
  files: {
    [id: string]: ({
      location: string
      id: string
      algMatch?: SimilarityToLibs
      comments?: string
    }) &
      matchReport &
      candidatesReport
  }
}
export type ReactNativeManualAnalysisReport = {
  app: appDesc<APP_TYPES.reactNative>
  files: {
    [id: string]: ({ idType: 's'; id: string } | { idType: 'n'; id: number }) &
      ({ algMatch?: SimilarityToLibs; comments?: string }) &
      matchReport &
      candidatesReport
  }
} & candidatesReport
export type ManualAnalysisReport = CordovaManualAnalysisReport | ReactNativeManualAnalysisReport
export interface ManuallyAnalysedApps {
  [name: string]: ManualAnalysisReport
}

export const appsAnalysed: ManuallyAnalysedApps = {}
