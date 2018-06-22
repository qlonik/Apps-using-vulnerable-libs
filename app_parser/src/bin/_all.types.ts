import { Logger } from 'pino'
import { The } from 'typical-mini'
import { MessagesMap } from 'workerpool'
import { appDesc } from '../parseApps'
import { libNameVersion } from '../parseLibraries'

export type MainFn = (log: Logger) => Promise<any>
export type TerminateFn = (signal: 'SIGINT') => void

export type allMessages = The<
  MessagesMap,
  {
    'reanalyse-lib': [[{ libsPath: string; lib: libNameVersion }], any]

    'preprocess-app': [[{ allAppsPath: string; allLibsPath: string; app: appDesc }], boolean]
    'analyse-app': [[{ allAppsPath: string; allLibsPath: string; app: appDesc }], boolean]
  }
>

export const WORKER_FILENAME = '_all.worker'
