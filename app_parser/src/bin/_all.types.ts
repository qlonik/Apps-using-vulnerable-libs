import { Logger } from 'pino'
import { The } from 'typical-mini'
import { MessagesMap } from 'workerpool'
import { APP_TYPES, appDesc } from '../parseApps'
import { libNameVersion } from '../parseLibraries'

export type MainFn = (log: Logger) => Promise<any>
export type TerminateFn = (signal: 'SIGINT') => void

export type CouchDumpFormat = {
  name: string
  versions: { v: string; time: string }[]
}

export type allMessages = The<
  MessagesMap,
  {
    'extract-lib-from-dump': [[{ libsPath: string; dumpPath: string; filename: string }], any]
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

    'preprocess-app': [[{ allAppsPath: string; allLibsPath: string; app: appDesc }], boolean]
    'analyse-app': [[{ allAppsPath: string; allLibsPath: string; app: appDesc }], boolean]
  }
>

export const WORKER_FILENAME = '_all.worker'
