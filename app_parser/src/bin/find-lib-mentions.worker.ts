import escapeStringRegexp from 'escape-string-regexp'
import { readJSON } from 'fs-extra'
import { includes } from 'lodash'
import { worker } from 'workerpool'
import { APP_TYPES, getAnalysedData, getCordovaAnalysisFiles } from '../parseApps'
import { resolveAllOrInParallel } from '../utils'
import { foundMentionsMap, messages, npmLibs, regexLibs } from './find-lib-mentions'

const NAME_VERSION_REGEX = /([\w-]+)\s+(?:@?version\s+)?(v?\d+\.\d+\.\d+)/g

type LibNames = { name: string; versions: string[] }[]
const NPM_LIB_NAMES = '../data/logs/2018-05-17T01:51:56.034Z/liblibNamesVersions.json'
const NAMES_REG_ARR = (readJSON(NPM_LIB_NAMES) as Promise<LibNames>).then((libNamesVersions) => {
  return libNamesVersions.map(({ name }) => ({
    name,
    reg: new RegExp(`[\\W_]${escapeStringRegexp(name)}[\\W_]`, 'g'),
  }))
})

worker<messages>({
  findLibMentions: async ({ APPS_PATH, app }) => {
    const namesRegArr = await NAMES_REG_ARR

    if (app.type === APP_TYPES.cordova) {
      const analysedFiles = await getAnalysedData(
        APPS_PATH,
        app,
        await getCordovaAnalysisFiles(APPS_PATH, app),
      )

      const found = await resolveAllOrInParallel(
        analysedFiles.map(({ file, signature }) => async () => {
          if (signature === null) {
            return false
          }

          const regexLibsMap = new Map<regexLibs[0], regexLibs[1]>()
          const npmLibsMap = new Map<npmLibs[0], npmLibs[1]>()

          for (let comment of signature.comments) {
            const commentStr = Array.isArray(comment) ? comment.join('\n') : comment

            let foundMatch
            // This while loop finds all matches of regex in the string. Found on MDN:
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec#Examples
            while ((foundMatch = NAME_VERSION_REGEX.exec(commentStr)) !== null) {
              const [, name, version] = foundMatch
              const { count, versions } = regexLibsMap.get(name) || { count: 0, versions: [] }
              regexLibsMap.set(name, {
                count: count + 1,
                versions: includes(versions, version) ? versions : versions.concat(version),
              })
            }
            NAME_VERSION_REGEX.lastIndex = 0

            namesRegArr.forEach(({ name, reg }) => {
              // same while loop as above
              while (reg.exec(commentStr) !== null) {
                const { count } = npmLibsMap.get(name) || { count: 0 }
                npmLibsMap.set(name, { count: count + 1 })
              }
              reg.lastIndex = 0
            })
          }

          return {
            file,
            regexLibs: [...regexLibsMap] as regexLibs[],
            npmLibs: [...npmLibsMap] as npmLibs[],
          }
        }),
      )

      return found.reduce(
        (acc, o) => (o === false ? acc : { ...acc, [o.file.path]: o }),
        {} as foundMentionsMap,
      )
    }

    if (app.type === APP_TYPES.reactNative) {
      return false
    }

    return false
  },
})
