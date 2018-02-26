import { mkdirp, pathExists, readFile } from 'fs-extra'
import { JSDOM } from 'jsdom'
import { flatten } from 'lodash'
import { join } from 'path'
import { URL } from 'url'
import { extractStructure } from '../extractStructure'
import { getSimilarityToLibs } from '../similarityIndex'
import { leftPad, opts, resolveAllOrInParallel } from '../utils'
import { fileDescOp, fileOp, saveFiles } from '../utils/files'
import { stdoutLog } from '../utils/logger'
import { APP_TYPES, appDesc, getApps } from './getters'
import { AppParserFn, AppsFolderParserFn, IsAppTypeFn } from './index'

const NAMESPACE = 'cordova'
const log = stdoutLog(NAMESPACE)

export const isCordovaApp: IsAppTypeFn = async function({ appPath }): Promise<boolean> {
  const indexHtmlPath = join(appPath, ...['assets', 'www', 'index.html'])
  const cordovaJsPath = join(appPath, ...['assets', 'www', 'cordova.js'])

  return (await pathExists(indexHtmlPath)) && (await pathExists(cordovaJsPath))
}

export const parseScriptsFromCordovaApp: AppParserFn = async (
  { appPath, libsPath },
  { debugDoLess = false, chunkLimit = 10, chunkSize = 10, conservative = true }: opts = {},
) => {
  const indexHtmlPath = join(appPath, 'extractedJs/index.html')
  const analysisFolderPath = join(appPath, 'jsAnalysis')
  await mkdirp(analysisFolderPath)
  const { window: { document } } = await JSDOM.fromFile(indexHtmlPath)

  const parseScriptTags = (location: 'head' | 'body') => {
    const scriptTags = document.querySelectorAll(`${location} script`) as NodeListOf<
      HTMLScriptElement
    >
    return [...scriptTags].map((script: HTMLScriptElement, i) => {
      // for each script tag we do following
      return async () => {
        const cwd = join(analysisFolderPath, location, leftPad(i))
        const fileOps: fileDescOp[] = []

        /**
         * Important object
         */
        let infoObject: {
          scriptTagLocation: string
          scriptTagIndex: number
        } & (
          | {
              type: 'src'
              originalSrc: string
              originalPath: string
              originalProtocol: string
            }
          | {
              type: 'content'
            }
          | {
              type: 'unknown'
              tagKeys: string[]
            })
        let content: string = ''

        if (script.src) {
          const url = new URL(script.src)
          infoObject = {
            scriptTagLocation: location,
            scriptTagIndex: i,

            type: 'src',
            originalSrc: script.src,
            originalPath: url.pathname,
            originalProtocol: url.protocol,
          }

          if (url.protocol === 'file:') {
            fileOps.push({
              cwd,
              dst: 'libDesc.js',
              type: fileOp.copy,
              src: url.pathname,
              conservative,
            })
            content = await readFile(url.pathname, 'utf-8')
          } else if (url.protocol === 'http:' || url.protocol === 'https:') {
            console.log('script referenced via http / https!')
          } else {
            console.log(`${location} script #${i} has an unknown src!`)
          }
        } else if (script.text) {
          infoObject = {
            scriptTagLocation: location,
            scriptTagIndex: i,

            type: 'content',
          }

          fileOps.push({
            cwd,
            dst: 'libDesc.js',
            type: fileOp.text,
            text: script.text,
            conservative,
          })
          content = script.text
        } else {
          console.log(`something unknown with ${location} script #${i}`)
          infoObject = {
            scriptTagLocation: location,
            scriptTagIndex: i,

            type: 'unknown',
            tagKeys: Object.keys(script),
          }
        }

        const signature = await extractStructure({ content })
        const sims = await getSimilarityToLibs({ signature, libsPath })

        const saved = await saveFiles(
          fileOps.concat([
            { cwd, dst: 'info.json', type: fileOp.json, json: infoObject, conservative },
            { cwd, dst: 'libStructure.json', type: fileOp.json, json: signature, conservative },
            { cwd, dst: 'similarities.json', type: fileOp.json, json: sims, conservative: false },
          ]),
        )
      }
    })
  }

  const lazyScriptTags = parseScriptTags('head').concat(parseScriptTags('body'))
  let contents
  if (debugDoLess) {
    contents = [await lazyScriptTags[0](), await lazyScriptTags[1]()]
  } else {
    contents = await resolveAllOrInParallel(lazyScriptTags, { chunkLimit, chunkSize })
  }
  // console.log(contents.map(s => s.length <= 1000 ? s : s.length))
}

export const parseScriptsFromCordovaApps: AppsFolderParserFn = async (
  { allAppsPath, libsPath },
  { debugDoLess = false, conservative = true, chunkLimit = 2, chunkSize = 1 }: opts = {},
) => {
  const apps = await getApps(allAppsPath, APP_TYPES.cordova)
  const lazyAppAnalysis = apps.map(({ type, section, app }) => {
    return async () => {
      const appResults = await parseScriptsFromCordovaApp(
        {
          appPath: join(allAppsPath, type, section, app),
          libsPath,
        },
        { conservative },
      )
      log('finished %o/%o/%o', type, section, app)
      return appResults
    }
  })
  if (debugDoLess) {
    await Promise.all([lazyAppAnalysis[0](), lazyAppAnalysis[1]()])
  } else {
    await resolveAllOrInParallel(lazyAppAnalysis, { chunkLimit, chunkSize })
  }
}

export const preprocessCordovaApp = async (
  {
    allAppsPath,
    app: { type, section, app },
  }: {
    allAppsPath: string
    app: appDesc
  },
  { conservative = true }: opts = {},
) => {
  const appPath = join(allAppsPath, type, section, app)
  const indexHtmlPath = join(appPath, 'js', 'index.html')
  const jsAnalysisPath = join(appPath, 'an')
  await mkdirp(jsAnalysisPath)
  const { window: { document } } = await JSDOM.fromFile(indexHtmlPath)
  const parseScriptTags = flatten(
    ['head', 'body'].map((location) => {
      const scriptTags = document.querySelectorAll(`${location} script`) as NodeListOf<
        HTMLScriptElement
      >

      return [...scriptTags].map((script: HTMLScriptElement, i) => {
        return async () => {
          const cwd = join(jsAnalysisPath, location, leftPad(i))
          const fileOps: fileDescOp[] = []

          /**
           * Important object
           */
          let infoObject: {
            scriptTagLocation: string
            scriptTagIndex: number
          } & (
            | {
                type: 'src'
                originalSrc: string
                originalPath: string
                originalProtocol: string
              }
            | {
                type: 'content'
              }
            | {
                type: 'unknown'
                tagKeys: string[]
              })
          let content: string = ''

          if (script.src) {
            const url = new URL(script.src)
            infoObject = {
              scriptTagLocation: location,
              scriptTagIndex: i,

              type: 'src',
              originalSrc: script.src,
              originalPath: url.pathname,
              originalProtocol: url.protocol,
            }

            if (url.protocol === 'file:') {
              fileOps.push({
                cwd,
                dst: 'libDesc.js',
                type: fileOp.copy,
                src: url.pathname,
                conservative,
              })
              content = await readFile(url.pathname, 'utf-8')
            } else if (url.protocol === 'http:' || url.protocol === 'https:') {
              log('script referenced via http / https!')
            } else {
              log(`%o script #%o has an unknown src!`, location, i)
            }
          } else if (script.text) {
            infoObject = {
              scriptTagLocation: location,
              scriptTagIndex: i,

              type: 'content',
            }

            fileOps.push({
              cwd,
              dst: 'libDesc.js',
              type: fileOp.text,
              text: script.text,
              conservative,
            })
            content = script.text
          } else {
            log(`something unknown with %o script #%o`, location, i)
            infoObject = {
              scriptTagLocation: location,
              scriptTagIndex: i,

              type: 'unknown',
              tagKeys: Object.keys(script),
            }
          }

          const signature = await extractStructure({ content })

          return await saveFiles(
            fileOps.concat([
              { cwd, dst: 'info.json', type: fileOp.json, json: infoObject, conservative },
              { cwd, dst: 'libStructure.json', type: fileOp.json, json: signature, conservative },
            ]),
          )
        }
      })
    }),
  )

  await resolveAllOrInParallel(parseScriptTags)
}
