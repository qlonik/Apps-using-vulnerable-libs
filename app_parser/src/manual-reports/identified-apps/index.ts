import { appDesc } from '../../parseApps'
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
export type ManualAnalysisReport = {
  app: appDesc
  files: {
    [id: string]: ({
      algMatch?: SimilarityToLibs
      comments?: string
    }) &
      (
        | { location: string; id: string }
        | { id: string; idType: 's' }
        | { id: number; idType: 'n' }) &
      matchReport &
      candidatesReport
  }
} & ({} | candidatesReport)
export interface ManuallyAnalysedApps {
  [name: string]: ManualAnalysisReport
}

export const appsAnalysed: ManuallyAnalysedApps = {}
