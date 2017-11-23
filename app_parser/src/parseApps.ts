import { copy, ensureDir, mkdirp, outputFile, pathExists, readFile } from 'fs-extra'
import { JSDOM } from 'jsdom'
import { take } from 'lodash'
import { join } from 'path'
import { URL } from 'url'

import { extractStructure } from './extractStructure'
import { getSimilarities } from './similarityIndex'
import { chunk, leftPad, resolveParallelGroups } from './utils'
import { myWriteJSON } from './utils/files'


const LIMIT_SIMILARITIES = 100

export type appDesc = {
  section: string,
  app: string,
}

export type parseScriptsFromHTMLConf = {
  DEBUG_DO_JUST_ONE?: boolean,
  appPath: string,
  libsPath: string,
}

export async function isCordovaApp(
  { allAppsPath, appDesc }: { allAppsPath: string, appDesc: appDesc }) {

  const relIndexHtmlPath = ['assets', 'www', 'index.html']
  const relCordovaJsPath = ['assets', 'www', 'cordova.js']
  const appPath = join(allAppsPath, appDesc.section, appDesc.app, 'apktool.decomp')
  const indexHtmlPath = join(appPath, ...relIndexHtmlPath)
  const cordovaJsPath = join(appPath, ...relCordovaJsPath)

  return await pathExists(indexHtmlPath) && await pathExists(cordovaJsPath)
}

export async function parseScriptsFromCordovaApp({
  DEBUG_DO_JUST_ONE: DEBUG_DO_JUST_ONE = false,
  appPath,
  libsPath,
}: parseScriptsFromHTMLConf) {

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
        const allSimilarities = await getSimilarities({ signature: structure, libsPath })
        const similarities = take(allSimilarities, LIMIT_SIMILARITIES)

        await Promise.all([
          myWriteJSON({ file: infoFileLocation, content: infoObject }),
          myWriteJSON({ file: fnSignFilePath, content: structure }),
          myWriteJSON({ file: similaritiesFilePath, content: similarities }),
        ])

        // await extractComments({ scriptFolder, content })
      }
    })
  }

  const lazyScriptTags = parseScriptTags('head').concat(parseScriptTags('body'))
  let contents
  if (DEBUG_DO_JUST_ONE) {
    contents = [await lazyScriptTags[0](), await lazyScriptTags[1]()]
  }
  else {
    contents = await resolveParallelGroups(chunk(lazyScriptTags, 10))
  }
  // console.log(contents.map(s => s.length <= 1000 ? s : s.length))
}

