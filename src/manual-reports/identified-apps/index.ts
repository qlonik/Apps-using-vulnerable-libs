import { APP_TYPES, appDesc } from '../../parseApps'
import { id as id_000, report as report_000 } from './000'
import { id as id_001, report as report_001 } from './001'
import { id as id_002, report as report_002 } from './002'
import { id as id_003, report as report_003 } from './003'
import { id as id_004, report as report_004 } from './004'
import { id as id_005, report as report_005 } from './005'
import { id as id_006, report as report_006 } from './006'
import { id as id_007, report as report_007 } from './007'
import { id as id_008, report as report_008 } from './008'
import { id as id_010, report as report_010 } from './010'

export type match = {
  name: string
  version?: string
  file?: string
  /**
   * true if it is a guess from variable names, or string value, or other side-channel info
   * false if it is detected by comment
   */
  isGuess: boolean
  /**
   * reports if the part of the file which corresponds to this library is minified or not
   */
  minified: boolean
  comments?: string
}
export type matchReport =
  | { type: 'unknown' | ''; match?: match | match[] }
  | { type: 'business-logic' }
  | { type: 'http-script' }
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
      ({
        comments?: string
      }) &
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
  [id_005]: report_005,
  [id_006]: report_006,
  [id_007]: report_007,
  [id_008]: report_008,
  [id_010]: report_010,
}
