import { appDesc } from '../parseApps'
import { libNameVersionSigFile } from '../parseLibraries'
import { candidateLib } from '../similarityIndex'
import { indexValue } from '../similarityIndex/set'

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
          | { type: 'unknown' | ''; match?: any }
          | { type: 'business-logic' }
          | { type: 'single-lib'; match: libNameVersionSigFile }
          | { type: 'bundle'; match: libNameVersionSigFile[] }) &
        (
          | { candidateType: 'empty' }
          | { candidateType: 'subset'; candidates: string[] }
          | { candidateType: 'sll'; candidates: candidateLib[] })
    }
  }
}

export const appsAnalysed: ManuallyAnalysedApps = {}
