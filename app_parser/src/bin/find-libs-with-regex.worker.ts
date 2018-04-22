import { worker } from 'workerpool'
import { flatten, includes } from 'lodash'
import { analysisFile, APP_TYPES, getAnalysedData, getCordovaAnalysisFiles } from '../parseApps'
import { resolveAllOrInParallel } from '../utils'
import { foundLibs, messages } from './find-libs-with-regex'

worker<messages>({
  findLibsWithRegex: async ({ allAppsPath, app }) => {
    const reg = /(\w+)\s(\d+\.\d+\.\d+)/

    if (app.type === APP_TYPES.cordova) {
      const analysisFiles = await getCordovaAnalysisFiles(allAppsPath, app)
      const analysedFiles = await getAnalysedData(allAppsPath, app, analysisFiles)

      // eslint-disable-next-line no-unused-vars
      type foundMentions = { file: analysisFile; libs: foundLibs[] }
      const found = await resolveAllOrInParallel(
        analysedFiles.map(({ file, signature }) => async (): Promise<boolean | foundMentions> => {
          if (signature === null) {
            return false
          }

          const foundLibsMap = new Map<foundLibs[0], foundLibs[1]>()

          for (let comment of flatten(signature.comments)) {
            const match = comment.match(reg)
            if (match === null) {
              continue
            }

            const name = match[1]
            const version = match[2]
            const { count, versions } = foundLibsMap.get(name) || { count: 0, versions: [] }
            if (!includes(versions, version)) {
              versions.push(version)
            }
            foundLibsMap.set(name, { count: count + 1, versions })
          }

          return {
            file,
            libs: [...foundLibsMap],
          }
        }),
      )

      return found.filter((o): o is foundMentions => typeof o !== 'boolean')
    }

    if (app.type === APP_TYPES.reactNative) {
      return false
    }

    return false
  },
})

process.on('SIGINT', () => {})
