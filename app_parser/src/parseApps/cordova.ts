import { mkdirp, pathExists, readFile, readJSON } from 'fs-extra'
import { JSDOM } from 'jsdom'
import { flatten, groupBy } from 'lodash'
import { map } from 'lodash/fp'
import { join, sep } from 'path'
import { URL } from 'url'
import { extractStructure, signatureWithComments } from '../extractStructure'
import {
  bundle_similarity_fn,
  candidateLib,
  getCandidateLibs,
  rankType,
  Similarity,
} from '../similarityIndex'
import { probIndex } from '../similarityIndex/similarity-methods/types'
import { leftPad, opts, resolveAllOrInParallel } from '../utils'
import { CordovaAppDataError } from '../utils/errors'
import { fileDescOp, fileOp, saveFiles } from '../utils/files'
import logger from '../utils/logger'
import {
  ANALYSIS_FOLDER,
  CORDOVA_CAND_FILE,
  CORDOVA_INFO_FILE,
  CORDOVA_LIB_FILE,
  CORDOVA_MAIN_FILE,
  CORDOVA_NON_EXISTENT_NOTICE_FILE,
  CORDOVA_NON_PARSED_NOTICE_FILE,
  CORDOVA_SIG_FILE,
  CORDOVA_SIM_FILE,
  JS_DATA_FOLDER,
} from './constants'
import { APP_TYPES, appDesc, appPath as appPathFn, getCordovaAnalysisFiles } from './getters'
import { AppAnalysisReport, CordovaAnalysisReport, IsAppTypeFn } from './index'

/* eslint-disable no-unused-vars */
declare const __x: APP_TYPES
declare const __y: Similarity
/* eslint-enable */

const fileLog = logger.child({ name: 'a.cordova' })
const createLocationLog = (
  type: appDesc['type'],
  section: appDesc['section'],
  app: appDesc['app'],
  location: string,
  id: string,
) => fileLog.child({ app: { type, section, app }, script: { location, id } })

const hideFile = (fileOps: fileDescOp[]) =>
  fileOps.map((o) => {
    const splitPath = o.cwd.split(sep)
    splitPath[splitPath.length - 1] = '_' + splitPath[splitPath.length - 1]
    return { ...o, cwd: join(...splitPath) }
  })

export const isCordovaApp: IsAppTypeFn = async function({ appPath }): Promise<boolean> {
  const indexHtmlPath = join(appPath, ...['assets', 'www', 'index.html'])
  const cordovaJsPath = join(appPath, ...['assets', 'www', 'cordova.js'])

  return (await pathExists(indexHtmlPath)) && (await pathExists(cordovaJsPath))
}

export const preprocessCordovaApp = async (
  {
    allAppsPath,
    allLibsPath,
    app: { type, section, app },
  }: {
    allAppsPath: string
    allLibsPath?: string
    app: appDesc
  },
  { conservative = false, extractorOpts }: opts = {},
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
          const log = createLocationLog(type, section, app, location, leftPad(i))

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
          let extractionWarnMsg = ''
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
              if (await pathExists(url.pathname)) {
                fileOps.push({
                  cwd,
                  dst: CORDOVA_LIB_FILE,
                  type: fileOp.copy,
                  src: url.pathname,
                  conservative,
                })
                content = await readFile(url.pathname, 'utf-8')
              } else {
                extractionWarnMsg = 'script source file does not exist'
              }
            } else if (url.protocol === 'http:' || url.protocol === 'https:') {
              extractionWarnMsg = 'script referenced via http / https'
            } else {
              extractionWarnMsg = 'script has an unknown source type'
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
            infoObject = {
              scriptTagLocation: location,
              scriptTagIndex: i,

              type: 'unknown',
              tagKeys: Object.keys(script),
            }
            extractionWarnMsg = 'unknown script tag type'
          }
          fileOps.push({
            cwd,
            dst: CORDOVA_INFO_FILE,
            type: fileOp.json,
            json: infoObject,
            conservative,
          })
          if (!content) {
            log.warn({ info: infoObject }, extractionWarnMsg)
            fileOps.push({
              cwd,
              dst: CORDOVA_NON_EXISTENT_NOTICE_FILE,
              type: fileOp.text,
              text: extractionWarnMsg,
              conservative,
            })
            return await saveFiles(hideFile(fileOps))
          }

          let signature
          try {
            signature = await extractStructure({ content, options: extractorOpts })
          } catch (err) {
            log.error({ err, info: infoObject }, 'could not parse js file')
            fileOps.push({
              cwd,
              dst: CORDOVA_NON_PARSED_NOTICE_FILE,
              type: fileOp.text,
              text: 'THIS FILE COULD NOT BE PARSED',
              conservative,
            })
            return await saveFiles(hideFile(fileOps))
          }
          fileOps.push({
            cwd,
            dst: CORDOVA_SIG_FILE,
            type: fileOp.json,
            json: signature,
            conservative,
          })

          if (allLibsPath) {
            const candidates = await getCandidateLibs({
              signature,
              libsPath: allLibsPath,
              opts: { limit: 10 },
            })
            fileOps.push({
              cwd,
              dst: CORDOVA_CAND_FILE,
              type: fileOp.json,
              json: candidates,
              conservative,
            })
          }

          return await saveFiles(fileOps)
        }
      })
    }),
  )

  await resolveAllOrInParallel(parseScriptTags)
}

const changeMapToArrayPairs = map((r: rankType) => ({
  ...r,
  matches: r.matches.map((m) => ({
    ...m,
    mapping: [...m.mapping.entries()] as [number, probIndex][],
  })),
}))

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
  const locationId = await getCordovaAnalysisFiles(allAppsPath, { type, section, app })

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
      const log = createLocationLog(type, section, app, location, id)
      const cwd = join(analysisPath, location, id)
      const sigPath = join(cwd, CORDOVA_SIG_FILE)
      const signature = (await readJSON(sigPath)) as signatureWithComments
      const candPath = join(cwd, CORDOVA_CAND_FILE)
      const candidates = (await readJSON(candPath)) as candidateLib[]

      const noCandidatesFound = candidates.length === 0
      if (noCandidatesFound) {
        log.warn({ app: { type, section, app }, file: { location, id } }, 'no candidates')
        return { location, id, noCandidatesFound }
      }

      const sim = await bundle_similarity_fn(signature, candidates, libsPath)

      await saveFiles({
        cwd,
        dst: CORDOVA_SIM_FILE,
        conservative: false,
        type: fileOp.json,
        json: {
          rank: changeMapToArrayPairs(sim.rank),
          secondary: changeMapToArrayPairs(sim.secondary),
          remaining: sim.remaining,
        },
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
