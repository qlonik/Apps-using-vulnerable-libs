import { mkdirp, pathExists, readdir, readFile, readJSON } from 'fs-extra'
import { JSDOM } from 'jsdom'
import { flatten, groupBy } from 'lodash'
import { join } from 'path'
import { URL } from 'url'
import { extractStructure, signatureNew } from '../extractStructure'
import { getCandidateLibs, getSimilarityToLibs } from '../similarityIndex'
import { leftPad, opts, resolveAllOrInParallel } from '../utils'
import { CordovaAppDataError } from '../utils/errors'
import { fileDescOp, fileOp, saveFiles } from '../utils/files'
import { stdoutLog } from '../utils/logger'
import {
  ANALYSIS_FOLDER,
  CORDOVA_INFO_FILE,
  CORDOVA_LIB_FILE,
  CORDOVA_MAIN_FILE,
  CORDOVA_SIG_FILE,
  CORDOVA_SIM_FILE,
  JS_DATA_FOLDER,
} from './constants'
import { APP_TYPES, appDesc, appPath as appPathFn, getApps } from './getters'
import {
  AppAnalysisReport,
  AppParserFn,
  AppsFolderParserFn,
  CordovaAnalysisReport,
  IsAppTypeFn,
} from './index'

const NAMESPACE = 'a.cordova'
const log = stdoutLog(NAMESPACE)

export const isCordovaApp: IsAppTypeFn = async function({ appPath }): Promise<boolean> {
  const indexHtmlPath = join(appPath, ...['assets', 'www', 'index.html'])
  const cordovaJsPath = join(appPath, ...['assets', 'www', 'cordova.js'])

  return (await pathExists(indexHtmlPath)) && (await pathExists(cordovaJsPath))
}

/**
 * @deprecated
 */
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

/**
 * @deprecated
 */
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
  { conservative = false }: opts = {},
) => {
  const appPath = join(allAppsPath, type, section, app)
  const indexHtmlPath = join(appPath, JS_DATA_FOLDER, CORDOVA_MAIN_FILE)
  const jsAnalysisPath = join(appPath, ANALYSIS_FOLDER)
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
                dst: CORDOVA_LIB_FILE,
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
              dst: CORDOVA_LIB_FILE,
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
              { cwd, dst: CORDOVA_INFO_FILE, type: fileOp.json, json: infoObject, conservative },
              { cwd, dst: CORDOVA_SIG_FILE, type: fileOp.json, json: signature, conservative },
            ]),
          )
        }
      })
    }),
  )

  await resolveAllOrInParallel(parseScriptTags)
}

export const analyseCordovaApp = async ({
  allAppsPath,
  libsPath,
  app: { type, section, app },
}: {
  allAppsPath: string
  libsPath: string
  app: appDesc
  report?: AppAnalysisReport | null
}): Promise<CordovaAnalysisReport> => {
  const appPath = appPathFn(allAppsPath, type, section, app)
  const analysisPath = join(appPath, ANALYSIS_FOLDER)
  if (!await pathExists(analysisPath)) {
    throw new CordovaAppDataError(`missing analysis folder (${analysisPath})`)
  }
  const locations = await readdir(analysisPath)
  const locationId = flatten(
    await resolveAllOrInParallel(
      locations.map((location) => async () => {
        return (await readdir(join(analysisPath, location))).map((id) => ({ location, id }))
      }),
    ),
  )

  const localReport = {
    totalFiles: locationId.length,
    totalFilesPerLocation: {},
    noCandidates: 0,
    noCandidatesPerLocation: {},
  } as CordovaAnalysisReport

  const locationGroups = groupBy(locationId, 'location')
  for (let location of Object.keys(locationGroups)) {
    localReport.totalFilesPerLocation[location] = locationGroups[location].length
  }

  const candidateLibsMissing = await resolveAllOrInParallel(
    locationId.map(({ location, id }) => async () => {
      const cwd = join(analysisPath, location, id)
      const sigPath = join(cwd, CORDOVA_SIG_FILE)
      const signature = (await readJSON(sigPath)) as signatureNew

      const candidateLibs = await getCandidateLibs({ signature, libsPath })
      const noCandidatesFound = candidateLibs.length === 0
      if (noCandidatesFound) {
        log('WARNING: %o candidates in %o', 0, join(type, section, app, location, id))
      }

      const sim = await getSimilarityToLibs({
        signature,
        libsPath,
        names: !noCandidatesFound ? candidateLibs : undefined,
      })
      await saveFiles({
        cwd,
        dst: CORDOVA_SIM_FILE,
        conservative: false,
        type: fileOp.json,
        json: sim,
      })

      return { location, id, noCandidatesFound }
    }),
  )

  candidateLibsMissing.forEach(({ location, id, noCandidatesFound }) => {
    localReport.noCandidates += noCandidatesFound ? 1 : 0
    localReport.noCandidatesPerLocation[location] = (
      localReport.noCandidatesPerLocation[location] || []
    ).concat(id)
  })

  return localReport
}
