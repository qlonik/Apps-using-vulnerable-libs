import { appDesc } from '../parseApps'
import { libNameVersionSigFile } from '../parseLibraries'
import { candidateLib } from '../similarityIndex'

export type matchGuess = libNameVersionSigFile & { isGuess: boolean }
export type matchUnknown = { name: string; version: string; isGuess: boolean; comments: string }
export type candidatesReport =
  | { candidateType: 'empty' }
  | { candidateType: 'subset'; candidates: string[] }
  | { candidateType: 'sll'; candidates: candidateLib[] }
export interface ManuallyAnalysedApps {
  [name: string]: {
    app: appDesc
    files: {
      [id: string]: /* empty obj so prettier formats uniformly */ ({}) &
        (
          | { location: string; id: string }
          | { id: string; idType: 's' }
          | { id: number; idType: 'n' }) &
        (
          | { type: 'unknown' | ''; match?: matchUnknown | matchUnknown[] }
          | { type: 'business-logic' }
          | { type: 'single-lib'; match: matchGuess }
          | { type: 'bundle'; match: matchGuess[] }) &
        candidatesReport
    }
  } & ({} | candidatesReport)
}

export const appsAnalysed: ManuallyAnalysedApps = {}
