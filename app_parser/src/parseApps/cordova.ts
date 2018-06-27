import { mkdirp, pathExists, readFile, readJSON } from 'fs-extra'
import { JSDOM } from 'jsdom'
import { flatten, groupBy } from 'lodash'
import { join, sep } from 'path'
import { URL } from 'url'
import { extractStructure, signatureNew } from '../extractStructure'
import { isSigMinified, isSrcMinified } from '../extractStructure/tools'
import { getCandidateLibs, getSimilarityToLibs } from '../similarityIndex'
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
  CORDOVA_MINIFIED_NOTICE_FILE,
  CORDOVA_NON_PARSED_NOTICE_FILE,
  CORDOVA_SIG_FILE,
  CORDOVA_SIM_FILE,
  JS_DATA_FOLDER,
} from './constants'
import {
  appDesc,
  appPath as appPathFn,
  getCordovaAnalysisFiles,
  APP_TYPES, // eslint-disable-line no-unused-vars
} from './getters'
import { AppAnalysisReport, CordovaAnalysisReport, IsAppTypeFn } from './index'

const fileLog = logger.child({ name: 'a.cordova' })
const createLocationLog = (
  type: appDesc['type'],
  section: appDesc['section'],
  app: appDesc['app'],
  location: string,
  id: string,
) => fileLog.child({ app: { type, section, app }, script: { location, id } })

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
              log.debug({ info: infoObject }, 'script referenced via http / https!')
            } else {
              log.warn({ info: infoObject }, `script has an unknown src!`)
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
            log.warn({ info: infoObject }, `something unknown`)
          }
          fileOps.push({
            cwd,
            dst: CORDOVA_INFO_FILE,
            type: fileOp.json,
            json: infoObject,
            conservative,
          })

          let signature
          try {
            signature = await extractStructure({ content })
          } catch (err) {
            log.error({ err, info: infoObject }, 'could not parse js file')
            fileOps.push({
              cwd,
              dst: CORDOVA_NON_PARSED_NOTICE_FILE,
              type: fileOp.text,
              text: 'THIS FILE COULD NOT BE PARSED',
              conservative,
            })
            const mappedFileOps = fileOps.map((o) => {
              const splitPath = o.cwd.split(sep)
              splitPath[splitPath.length - 1] = '_' + splitPath[splitPath.length - 1]
              return { ...o, cwd: join(...splitPath) }
            })
            return await saveFiles(mappedFileOps)
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

          const minified = {
            srcMinified: isSrcMinified(content),
            sigMinified: isSigMinified(signature),
          }
          fileOps.push({
            cwd,
            dst: CORDOVA_MINIFIED_NOTICE_FILE,
            type: fileOp.json,
            json: minified,
            conservative,
          })

          if (minified.srcMinified || minified.sigMinified) {
            const mappedFileOps = fileOps.map((o) => {
              const splitPath = o.cwd.split(sep)
              splitPath[splitPath.length - 1] = '_' + splitPath[splitPath.length - 1]
              return { ...o, cwd: join(...splitPath) }
            })
            return await saveFiles(mappedFileOps)
          }

          return await saveFiles(fileOps)
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
      const signature = (await readJSON(sigPath)) as signatureNew

      const candidateLibs = await getCandidateLibs({ signature, libsPath })
      const noCandidatesFound = candidateLibs.length === 0
      if (noCandidatesFound) {
        log.warn('%o candidates', 0)
      }

      const sim = await getSimilarityToLibs({
        signature,
        libsPath,
        names: !noCandidatesFound ? candidateLibs.map(({ name }) => name) : undefined,
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
