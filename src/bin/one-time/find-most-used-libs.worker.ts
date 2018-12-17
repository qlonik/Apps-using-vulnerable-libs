import { worker } from 'workerpool'
import { analysisFile, APP_TYPES, getAnalysedData, getCordovaAnalysisFiles } from '../../parseApps'
import { resolveAllOrInParallel } from '../../utils'
import { messages } from './find-most-used-libs'

worker<messages>({
  findLibs: async ({ allAppsPath, libNamesArr, app }) => {
    const libNamesRegArr = libNamesArr.map((name) => ({
      name,
      reg: new RegExp(`[\\W_]${name}[\\W_]`),
    }))

    if (app.type === APP_TYPES.cordova) {
      const analysisFiles = await getCordovaAnalysisFiles(allAppsPath, app)
      const analysedFiles = await getAnalysedData(allAppsPath, app, analysisFiles)

      type foundMentions = { file: analysisFile; libs: string[] }
      const found = (await resolveAllOrInParallel(
        analysedFiles.map(({ file, signature }) => async () => {
          if (signature === null) {
            return false
          }

          const libNames = new Set(libNamesRegArr)
          const usedNames = new Set<string>()

          signature.comments.forEach(function recSearch(x: string | string[]) {
            if (Array.isArray(x)) {
              x.forEach(recSearch)
            } else {
              libNames.forEach((o) => {
                if (o.reg.test(x)) {
                  usedNames.add(o.name)
                  libNames.delete(o)
                }
              })
            }
          })

          return {
            file,
            libs: [...usedNames],
          }
        }),
      )) as (foundMentions | boolean)[]

      return found.filter((o): o is foundMentions => typeof o !== 'boolean')
    }

    if (app.type === APP_TYPES.reactNative) {
      return false
    }

    return false
  },
})

process.on('SIGINT', () => {})
