import { APP_TYPES, appDesc } from '../../parseApps'
import { id as id_000, report as report_000 } from './000'
import { id as id_001, report as report_001 } from './001'
import { id as id_002, report as report_002 } from './002'
import { id as id_003, report as report_003 } from './003'
import { id as id_004, report as report_004 } from './004'

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
export type CordovaManualAnalysisReport = {
  app: appDesc<APP_TYPES.cordova>
  files: {
    [id: string]: ({
      location: string
      id: string
      comments?: string
    }) &
      matchReport
  }
}
export type ReactNativeManualAnalysisReport = {
  app: appDesc<APP_TYPES.reactNative>
  files: {
    [id: string]: ({ idType: 's'; id: string } | { idType: 'n'; id: number }) &
      ({ comments?: string }) &
      matchReport
  }
}
export interface ManuallyAnalysedApps {
  [name: string]: CordovaManualAnalysisReport | ReactNativeManualAnalysisReport
}

export const appsAnalysed: ManuallyAnalysedApps = {
  [id_000]: report_000,
  [id_001]: report_001,
  [id_002]: report_002,
  [id_003]: report_003,
  [id_004]: report_004,
}
