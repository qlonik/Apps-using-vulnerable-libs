import { mkdirp, pathExists, readFile, readJSON } from 'fs-extra'
import { JSDOM } from 'jsdom'
import { groupBy } from 'lodash'
import { join, sep } from 'path'
import { URL } from 'url'
import { Pool } from 'workerpool'
import { extractStructure, signatureWithComments } from '../extractStructure'
import {
  bundle_similarity_fn,
  BundleSimFnArgSerializable,
  BundleSimFnReturn,
  candidateLib,
  getCandidateLibs,
  Similarity,
} from '../similarityIndex'
import { leftPad, opts, resolveAllOrInParallel } from '../utils'
import { CordovaAppDataError } from '../utils/errors'
import { fileDescOp, fileOp, saveFiles } from '../utils/files'
import logger from '../utils/logger'
import {
  ANALYSIS_FOLDER,
  CORDOVA_ANALYSIS_REPORT_FILE,
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
    allLibsPath: string
    app: appDesc
  },
  { conservative = false, extractorOpts }: opts = {},
) => {
  const appPath = join(allAppsPath, type, section, app)
  const indexHtmlPath = join(appPath, JS_DATA_FOLDER, CORDOVA_MAIN_FILE)
  const jsAnalysisPath = join(appPath, ANALYSIS_FOLDER)
  await mkdirp(jsAnalysisPath)
  const { window: { document } } = await JSDOM.fromFile(indexHtmlPath)
  const scriptTags = ['head', 'body'].reduce(
    (acc, location) => {
      const scripts = document.querySelectorAll<HTMLScriptElement>(`${location} script`)
      return acc.concat([...scripts].map((script) => ({ location, script })))
    },
    [] as { location: string; script: HTMLScriptElement }[],
  )
  const parseScriptTags = scriptTags.map(({ location, script }, i) => async () => {
    const cwd = join(jsAnalysisPath, location, leftPad(i))
    const fileOps: fileDescOp[] = []
    const log = fileLog.child({
      app: { type, section, app },
      file: { location, id: leftPad(i) },
    })

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

    return await saveFiles(fileOps)
  })

  await resolveAllOrInParallel(parseScriptTags)
}

export type BundSim = {
  bundle_similarity_fn: [[BundleSimFnArgSerializable], true | BundleSimFnReturn]
}
export const analyseCordovaApp = async <T extends BundSim>({
  allAppsPath,
  libsPath,
  app: { type, section, app },
  pool,
}: {
  allAppsPath: string
  libsPath: string
  app: appDesc
  pool?: Pool<T>
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
      const logDescrObj = { app: { type, section, app }, file: { location, id } }
      const log = fileLog.child(logDescrObj)
      const cwd = join(analysisPath, location, id)
      const sigPath = join(cwd, CORDOVA_SIG_FILE)
      const candPath = join(cwd, CORDOVA_CAND_FILE)

      let sim: BundleSimFnReturn

      if (pool) {
        log.debug('>-> started bundle_similarity_fn on worker')
        const res = await pool.exec('bundle_similarity_fn', [
          { libsPath, signaturePath: sigPath, candidatesPath: candPath, log: logDescrObj },
        ])
        log.debug('>-> finished bundle_similarity_fn on worker')

        if (res === true) {
          log.warn('no candidates')
          return { location, id, noCandidatesFound: true }
        } else {
          sim = res as BundleSimFnReturn
        }
      } else {
        const candidates = (await readJSON(candPath)) as candidateLib[]

        if (candidates.length === 0) {
          log.warn('no candidates')
          return { location, id, noCandidatesFound: true }
        }

        const signature = (await readJSON(sigPath)) as signatureWithComments

        log.debug('>-> started bundle_similarity_fn')
        sim = await bundle_similarity_fn({ libsPath, signature, candidates, log })
        log.debug('>-> finished bundle_similarity_fn')
      }

      await saveFiles({
        cwd,
        dst: CORDOVA_SIM_FILE,
        conservative: false,
        type: fileOp.json,
        json: sim,
      })

      return { location, id, noCandidatesFound: false }
    }),
  )

  candidateLibsMissing.forEach(({ location, id, noCandidatesFound }) => {
    if (noCandidatesFound) {
      localReport.noCandidates += 1
      localReport.noCandidatesPerLocation[location] = (
        localReport.noCandidatesPerLocation[location] || []
      ).concat(id)
    }
  })

  await saveFiles({
    cwd: analysisPath,
    dst: CORDOVA_ANALYSIS_REPORT_FILE,
    conservative: false,
    type: fileOp.json,
    json: localReport,
  })

  return localReport
}
