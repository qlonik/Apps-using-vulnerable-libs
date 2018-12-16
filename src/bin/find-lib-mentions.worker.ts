import escapeStringRegexp from 'escape-string-regexp'
import { readJSON } from 'fs-extra'
import { includes } from 'lodash'
import { worker } from 'workerpool'
import { APP_TYPES, getAnalysedData, getCordovaAnalysisFiles } from '../parseApps'
import { assert } from '../utils/logger'
import { CouchDumpFormat } from './_all.types'
import {
  foundNpmMentionsMap,
  foundRegexMentionsMap,
  messages,
  npmLibs,
  regexLibs,
} from './find-lib-mentions'

const NV_REG = /([\w-]+)\s+(?:@?version\s+)?(v?\d+\.\d+\.\d+)/g
/**
 * File contatining names and versions of libraries
 *
 * @example ```js
 *   // note this file has improper format and code will fail
 *   const NPM_LIBS_PATH = './data/logs/RIPPLE/npm-db-dump/click0/2018-05-17T01:51:56.034Z/liblibNamesVersions.json'
 * ```
 */
const NPM_LIBS_PATH = assert(process.env.NPM_LIBS_PATH, undefined, '$NPM_LIBS_PATH is not set')

const getSectionRange = (total: number, section: number, sections: number) => {
  const sectionSize = Math.ceil(total / sections)
  return [section * sectionSize, Math.min((section + 1) * sectionSize, total)]
}

worker<messages>({
  findRegexMentions: async ({ APPS_PATH, app }) => {
    if (app.type === APP_TYPES.cordova) {
      const analysedFiles = await getAnalysedData(
        APPS_PATH,
        app,
        await getCordovaAnalysisFiles(APPS_PATH, app),
      )

      const found = {} as foundRegexMentionsMap

      for (let { file, signature } of analysedFiles) {
        if (signature === null) {
          continue
        }

        const regexLibsCounts = {} as { [x: string]: number }
        const regexLibsVersions = {} as { [x: string]: string[] }

        for (let comment of signature.comments) {
          const commentStr = Array.isArray(comment) ? comment.join('\n') : comment

          let foundMatch
          // This while loop finds all matches of regex in the string. Found on MDN:
          // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec#Examples
          while ((foundMatch = NV_REG.exec(commentStr)) !== null) {
            const [, name, version] = foundMatch
            regexLibsCounts[name] = (regexLibsCounts[name] || 0) + 1
            const versions = regexLibsVersions[name] || []
            regexLibsVersions[name] = includes(versions, version)
              ? versions
              : versions.concat(version)
          }
          foundMatch = null as any
        }

        const regexLibs = Object.keys(regexLibsCounts).map((name): regexLibs => [
          name,
          { count: regexLibsCounts[name] || 0, versions: regexLibsVersions[name] || [] },
        ])
        found[file.path] = { file, regexLibs }
      }

      return found
    }

    if (app.type === APP_TYPES.reactNative) {
      return false
    }

    return false
  },
  findNpmMentions: async ({ APPS_PATH, app, section, SECTIONS }) => {
    const npmNVArr = (await readJSON(NPM_LIBS_PATH)) as CouchDumpFormat

    const namesArr = Object.keys(npmNVArr)
    const range = getSectionRange(namesArr.length, section, SECTIONS)
    const npmNameReg = namesArr.filter((_, i) => range[0] <= i && i < range[1]).map((name) => ({
      name,
      reg: new RegExp(`[\\W_]${escapeStringRegexp(name)}[\\W_]`, 'g'),
    }))

    if (app.type === APP_TYPES.cordova) {
      const analysedFiles = await getAnalysedData(
        APPS_PATH,
        app,
        await getCordovaAnalysisFiles(APPS_PATH, app),
      )

      const found = {} as foundNpmMentionsMap

      for (let { file, signature } of analysedFiles) {
        if (signature === null) {
          continue
        }

        const npmLibsCounts = {} as { [x: string]: number }

        for (let comment of signature.comments) {
          const commentStr = Array.isArray(comment) ? comment.join('\n') : comment

          for (let { name, reg } of npmNameReg) {
            // same while loop as above
            while (reg.test(commentStr)) {
              npmLibsCounts[name] = (npmLibsCounts[name] || 0) + 1
              // const { count } = npmLibsMap.get(name) || { count: 0 }
              // npmLibsMap.set(name, { count: count + 1 })
            }
            reg = null as any
          }
        }

        const npmLibs = Object.keys(npmLibsCounts).map((name): npmLibs => [
          name,
          { count: npmLibsCounts[name] || 0 },
        ])

        found[file.path] = { file, npmLibs }
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
