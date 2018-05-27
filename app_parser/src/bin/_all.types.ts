import { The } from 'typical-mini'
import { MessagesMap } from 'workerpool'
import { libNameVersion } from '../parseLibraries'

export type allMessages = The<
  MessagesMap,
  {
    'reanalyse-lib': [[{ libsPath: string; lib: libNameVersion }], any]
  }
>
