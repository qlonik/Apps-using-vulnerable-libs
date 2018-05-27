import { The } from 'typical-mini'
import { MessagesMap } from 'workerpool'
import { appDesc } from '../parseApps'
import { libNameVersion } from '../parseLibraries'

export type allMessages = The<
  MessagesMap,
  {
    'reanalyse-lib': [[{ libsPath: string; lib: libNameVersion }], any]

    'preprocess-app': [[{ allAppsPath: string; allLibsPath: string; app: appDesc }], boolean]
  }
>

export const WORKER_FILENAME = '_all.worker'
