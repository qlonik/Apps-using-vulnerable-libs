import { appDesc } from '../parseApps'
import { libNameVersionSigFile } from '../parseLibraries'

export interface ManuallyAnalysedApps {
  [name: string]: {
    app: appDesc
    files: {
      [id: string]: (
        | { location: string; id: string }
        | { id: string; idType: 's' }
        | { id: number; idType: 'n' }) &
        (
          | { type: 'unknown' | ''; match?: any }
          | { type: 'business-logic' }
          | { type: 'single-lib'; match: libNameVersionSigFile }
          | { type: 'bundle'; match: libNameVersionSigFile[] })
    }
  }
}

export const appsAnalysed: ManuallyAnalysedApps = {}
