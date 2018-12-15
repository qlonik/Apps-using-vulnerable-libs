import { Logger } from 'pino'
import { APP_TYPES, appDesc, BundSim } from '../parseApps'
import { libNameVersion } from '../parseLibraries'

export type EnvironmentSpecifier = { [key: string]: {} }
export type EnvironmentDefault = {
  OUT: string
}
export type EnvironmentValues<E extends EnvironmentSpecifier> = EnvironmentDefault &
  Record<keyof E, string>

export type MainFn<E extends EnvironmentSpecifier = {}> = (
  log: Logger,
  env: EnvironmentValues<E>,
) => Promise<any>
export type TerminateFn = (log: Logger) => (signal: 'SIGINT') => void

export interface CouchDumpFormat {
  [name: string]:
    | undefined
    | {
        [version: string]: undefined | string
      }
}

export enum DONE {
  ok,
  fail,
  failParseName, // failed to parse filename
  emptySig, // extracted signature is empty
  exclTime, // excluded because of cut-off time
  exclBL, // excluded because of black list
}

export type allMessages = {
  'extract-lib-from-dump': [
    [
      {
        libsPath: string
        dumpPath: string
        filename: string
        VERSIONS_PATH: string
        DATE: string
      }
    ],
    DONE
  ]
  'create-lib-literal-sig': [[{ libsPath: string; name: string }], boolean]
  'reanalyse-lib': [[{ libsPath: string; lib: libNameVersion }], any]

  'extract-app': [
    [{ inputPath: string; outputPath: string; section: string; app: string }],
    boolean
  ]
  're-extract-app': [[{ inputPath: string; outputPath: string; app: appDesc }], boolean]
  'move-decomp-app': [
    [{ inputPath: string; outputPath: string; section: string; app: string }],
    APP_TYPES | 'removed'
  ]
  'copy-apk': [
    [{ inputPath: string; outputPath: string; type: APP_TYPES; section: string; app: string }],
    boolean
  ]

  'preprocess-app': [
    [{ allAppsPath: string; appsAnalysisPath?: string; allLibsPath: string; app: appDesc }],
    boolean
  ]
} & BundSim

export const WORKER_FILENAME = '_all.worker'
