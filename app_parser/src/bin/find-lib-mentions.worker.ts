import escapeStringRegexp from 'escape-string-regexp'
import { readJSON } from 'fs-extra'
import { includes } from 'lodash'
import { worker } from 'workerpool'
import { APP_TYPES, getAnalysedData, getCordovaAnalysisFiles } from '../parseApps'
import { foundMentionsMap, messages, npmLibs, regexLibs } from './find-lib-mentions'

const NV_REG_STR = '([\\w-]+)\\s+(?:@?version\\s+)?(v?\\d+\\.\\d+\\.\\d+)'
const NPM_LIBS_PATH = '../data/logs/2018-05-17T01:51:56.034Z/liblibNamesVersions.json'
const NPM_LIBS_ARR = readJSON(NPM_LIBS_PATH) as Promise<{ name: string; versions: string[] }[]>

worker<messages>({
  findLibMentions: async ({ APPS_PATH, app }) => {
    const npmLibNames = await NPM_LIBS_ARR

    if (app.type === APP_TYPES.cordova) {
      const analysedFiles = await getAnalysedData(
        APPS_PATH,
        app,
        await getCordovaAnalysisFiles(APPS_PATH, app),
      )

      const found = {} as foundMentionsMap
      for (let { file, signature } of analysedFiles) {
        if (signature === null) {
          continue
        }

        const regexLibsMap = new Map<regexLibs[0], regexLibs[1]>()
        const npmLibsMap = new Map<npmLibs[0], npmLibs[1]>()

        for (let comment of signature.comments) {
          const commentStr = Array.isArray(comment) ? comment.join('\n') : comment

          let foundMatch
          let reg = new RegExp(NV_REG_STR, 'g')
          // This while loop finds all matches of regex in the string. Found on MDN:
          // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec#Examples
          while ((foundMatch = reg.exec(commentStr)) !== null) {
            const [, name, version] = foundMatch
            const { count, versions } = regexLibsMap.get(name) || { count: 0, versions: [] }
            regexLibsMap.set(name, {
              count: count + 1,
              versions: includes(versions, version) ? versions : versions.concat(version),
            })
          }
          foundMatch = null as any
          reg = null as any

          for (let { name } of npmLibNames) {
            let reg = new RegExp(`[\\W_]${escapeStringRegexp(name)}[\\W_]`, 'g')
            // same while loop as above
            while (reg.exec(commentStr) !== null) {
              const { count } = npmLibsMap.get(name) || { count: 0 }
              npmLibsMap.set(name, { count: count + 1 })
            }
            reg = null as any
          }
        }

        found[file.path] = {
          file,
          regexLibs: [...regexLibsMap] as regexLibs[],
          npmLibs: [...npmLibsMap] as npmLibs[],
        }
      }
      return found
    }

    if (app.type === APP_TYPES.reactNative) {
      return false
    }

    return false
  },
})

process.on('SIGINT', () => {})
