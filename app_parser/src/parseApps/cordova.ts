import { copy, ensureDir, mkdirp, move, outputFile, pathExists, readFile } from 'fs-extra'
import { JSDOM } from 'jsdom'
import { take } from 'lodash'
import { join } from 'path'
import { URL } from 'url'

import { extractStructure } from '../extractStructure'
import { getSimilarities } from '../similarityIndex'
import { leftPad, opts, resolveAllOrInParallel } from '../utils'
import { myWriteJSON } from '../utils/files'
import {
  AppParserFn,
  AppsFolderParserFn,
  AppTypeFn,
  getAppsAndSections,
  LIMIT_SIMILARITIES,
  MoveAppTypeFn,
} from './index'


export const isCordovaApp: AppTypeFn = async function (
  { allAppsPath, appDesc }): Promise<boolean> {

  const relIndexHtmlPath = ['assets', 'www', 'index.html']
  const relCordovaJsPath = ['assets', 'www', 'cordova.js']
  const appPath = join(allAppsPath, appDesc.section, appDesc.app, 'apktool.decomp')
  const indexHtmlPath = join(appPath, ...relIndexHtmlPath)
  const cordovaJsPath = join(appPath, ...relCordovaJsPath)

  return await pathExists(indexHtmlPath) && await pathExists(cordovaJsPath)
}

export const moveDefinitelyCordovaApps: MoveAppTypeFn = async function (
  { appTypePath, allAppsPath },
  { chunkLimit = 10, chunkSize = 10 }: opts = {}): Promise<void> {

  const apps = await getAppsAndSections({ allAppsPath })
  const movePromises = []
  for (let appDesc of apps) {
    if (!await isCordovaApp({ allAppsPath, appDesc })) {
      continue
    }

    const { section, app } = appDesc
    const src = join(allAppsPath, section, app)
    const dest = join(appTypePath, section, app)
    const jsSrc = join(dest, 'apktool.decomp', 'assets', 'www')
    const jsDest = join(dest, 'extractedJs')
    movePromises.push(async () => {
      await move(src, dest)
      await copy(jsSrc, jsDest)
    })
  }
  await resolveAllOrInParallel(movePromises, { chunkLimit, chunkSize })
}

export const parseScriptsFromCordovaApp: AppParserFn = async (
  { appPath, libsPath },
  { doJustOne = false, chunkLimit = 10, chunkSize = 10 }: opts = {}) => {

  const indexHtmlPath = join(appPath, 'extractedJs/index.html')
  const analysisFolderPath = join(appPath, 'jsAnalysis')
  await mkdirp(analysisFolderPath)
  const { window: { document } } = await JSDOM.fromFile(indexHtmlPath)

  const parseScriptTags = (location: 'head' | 'body') => {
    const scriptTags = <NodeListOf<HTMLScriptElement>>
      document.querySelectorAll(`${location} script`)
    return [...scriptTags].map((script: HTMLScriptElement, i) => {
      // for each script tag we do following
      return async () => {
        const scriptFolder = join(analysisFolderPath, location, leftPad(i))
        await ensureDir(scriptFolder)

        const scriptLocation = join(scriptFolder, 'libDesc.js')
        const infoFileLocation = join(scriptFolder, 'info.json')
        const fnSignFilePath = join(scriptFolder, 'libStructure.json')
        const similaritiesFilePath = join(scriptFolder, 'similarities.json')
        const jaccardSimilaritiesFilePath = join(scriptFolder, 'similarities-jaccard.json')

        /**
         * Important object
         */
        let infoObject: {
          scriptTagLocation: string,
          scriptTagIndex: number,
        } & ({
          type: 'src',
          originalSrc: string,
          originalPath: string,
          originalProtocol: string,
        } | {
          type: 'content',
        } | {
          type: 'unknown',
          tagKeys: string[],
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
            await copy(url.pathname, scriptLocation)
            content = await readFile(url.pathname, 'utf-8')
          }
          else if (url.protocol === 'http:' || url.protocol === 'https:') {
            console.log('script referenced via http / https!')
          }
        }
        else if (script.text) {
          infoObject = {
            scriptTagLocation: location,
            scriptTagIndex: i,

            type: 'content',
          }

          await outputFile(scriptLocation, script.text)
          content = script.text
        }
        else {
          console.log(`something unknown with ${location} script #${i}`)
          infoObject = {
            scriptTagLocation: location,
            scriptTagIndex: i,

            type: 'unknown',
            tagKeys: Object.keys(script),
          }
        }

        const structure = await extractStructure({ content })
        const { ourSim: allOurSim, jaccardSim: allJaccardSim } = await getSimilarities({
          signature: structure,
          libsPath,
        })

        await Promise.all([
          myWriteJSON({ file: infoFileLocation, content: infoObject }),
          myWriteJSON({ file: fnSignFilePath, content: structure }),
          myWriteJSON({
            file: similaritiesFilePath,
            content: take(allOurSim, LIMIT_SIMILARITIES),
          }),
          myWriteJSON({
            file: jaccardSimilaritiesFilePath,
            content: take(allJaccardSim, LIMIT_SIMILARITIES),
          }),
        ])
      }
    })
  }

  const lazyScriptTags = parseScriptTags('head').concat(parseScriptTags('body'))
  let contents
  if (doJustOne) {
    contents = [await lazyScriptTags[0](), await lazyScriptTags[1]()]
  }
  else {
    contents = await resolveAllOrInParallel(lazyScriptTags, { chunkLimit, chunkSize })
  }
  // console.log(contents.map(s => s.length <= 1000 ? s : s.length))
}

export const parseScriptsFromCordovaApps: AppsFolderParserFn = async (
  { allAppsPath, libsPath },
  { doJustOne = false, chunkLimit = 10, chunkSize = 5 }: opts = {}) => {

  const apps = await getAppsAndSections({ allAppsPath })
  const lazyAppAnalysis = apps.map((app) => {
    return async () => {
      return parseScriptsFromCordovaApp({
        appPath: join(allAppsPath, app.section, app.app),
        libsPath,
      })
    }
  })
  if (doJustOne) {
    await lazyAppAnalysis[0]()
    await lazyAppAnalysis[1]()
  }
  else {
    await resolveAllOrInParallel(lazyAppAnalysis, { chunkLimit, chunkSize })
  }
}
