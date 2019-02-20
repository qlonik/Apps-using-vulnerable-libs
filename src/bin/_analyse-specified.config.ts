import { APP_TYPES, cordovaAnalysisFile } from '../parseApps'
import { libName, libNameVersion } from '../parseLibraries'
import {
  FN_MATCHING_METHODS_TYPE,
  LIT_MATCHING_METHODS_TYPE,
} from '../similarityIndex/similarity-methods'
import { analysisDescriptor } from './analyse-specified'

export type METHODS_TYPE = LIT_MATCHING_METHODS_TYPE | FN_MATCHING_METHODS_TYPE
export type toAnalyseType = {
  /**
   * Methods to use
   */
  methods: '*' | METHODS_TYPE | METHODS_TYPE[]
  /**
   * App to analyse
   */
  app: analysisDescriptor['app']
  /**
   * Files to analyse
   */
  files: analysisDescriptor['file'][]
  /**
   * Libraries to compare against
   */
  libs: (
    | '*'
    | ((libName | libNameVersion | analysisDescriptor['lib']) & {
        /**
         * Target version of the detected library
         */
        shouldBeVersion?: string
        /**
         * Target file to contain detected library
         */
        shouldBeInFile?: string | string[]
      }))[]
}
export const TO_ANALYSE: toAnalyseType[] = [
  /* specify the config */
  {
    methods: ['fn-st-toks-v6', 'fn-names-our'],
    app: {
      type: APP_TYPES.cordova,
      section: 'random',
      app: 'Snowbuddy-1.2.8.apk',
    },
    files: [{ path: 'head/0013', location: 'body', id: '0013' }] as cordovaAnalysisFile[],
    libs: [
      { name: 'moment', version: '2.8.3', shouldBeVersion: '2.8.3', shouldBeInFile: 'body/0013' },
      { name: 'moment', version: '2.8.1' },
    ],
  },
]
