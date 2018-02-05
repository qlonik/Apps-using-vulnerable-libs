import { copy, mkdirp, move, pathExists, readFile, remove } from 'fs-extra'
import { JSDOM } from 'jsdom'
import { join } from 'path'
import { URL } from 'url'

import { extractFunctionStructure } from '../extractStructure'
import { getSimilarityToLibs } from '../similarityIndex'
import { leftPad, opts, resolveAllOrInParallel } from '../utils'
import { fileDescOp, fileOp, saveFiles } from '../utils/files'
import {
  AppParserFn,
  AppsFolderParserFn,
  getAppsAndSections,
  IsAppTypeFn,
  MoveAppTypeFn,
} from './index'


export const isCordovaApp: IsAppTypeFn = async function (
  { appPath }): Promise<boolean> {

  const indexHtmlPath = join(appPath, ...['assets', 'www', 'index.html'])
  const cordovaJsPath = join(appPath, ...['assets', 'www', 'cordova.js'])

  return await pathExists(indexHtmlPath) && await pathExists(cordovaJsPath)
}

export const moveDefinitelyCordovaApps: MoveAppTypeFn = async function (
  { appTypePath, allAppsPath },
  { chunkLimit = 10, chunkSize = 10 }: opts = {}): Promise<void> {

  const apps = await getAppsAndSections({ allAppsPath })
  const movePromises = []
  for (let { section, app } of apps) {
    const src = join(allAppsPath, section, app)
    if (!await isCordovaApp({ appPath: src })) {
      continue
    }

    const dest = join(appTypePath, section, app, 'apktool.decomp')
    if (await pathExists(dest)) {
      movePromises.push(async () => remove(src))
    }
    else {
      const jsSrc = join(dest, 'assets', 'www')
      const jsDest = join(dest, '..', 'extractedJs')
      movePromises.push(async () => {
        await move(src, dest)
        await copy(jsSrc, jsDest)
      })
    }
  }
  await resolveAllOrInParallel(movePromises, { chunkLimit, chunkSize })
}

export const parseScriptsFromCordovaApp: AppParserFn = async (
  { appPath, libsPath },
  {
    debugDoLess = false,
    chunkLimit = 10,
    chunkSize = 10,
    conservative = true,
  }: opts = {}) => {

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
        const cwd = join(analysisFolderPath, location, leftPad(i))
        const fileOps: fileDescOp[] = []

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
            fileOps.push({
              cwd,
              dst: 'libDesc.js',
              type: fileOp.copy,
              src: url.pathname,
              conservative,
            })
            content = await readFile(url.pathname, 'utf-8')
          }
          else if (url.protocol === 'http:' || url.protocol === 'https:') {
            console.log('script referenced via http / https!')
          }
          else {
            console.log(`${location} script #${i} has an unknown src!`)
          }
        }
        else if (script.text) {
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

        const signature = await extractFunctionStructure({ content })
        const sims = await getSimilarityToLibs({ signature, libsPath })

        const saved = await saveFiles(fileOps.concat([
          { cwd, dst: 'info.json', type: fileOp.json, json: infoObject, conservative },
          { cwd, dst: 'libStructure.json', type: fileOp.json, json: signature, conservative },
          { cwd, dst: 'similarities.json', type: fileOp.json, json: sims, conservative: false }
        ]))
      }
    })
  }

  const lazyScriptTags = parseScriptTags('head').concat(parseScriptTags('body'))
  let contents
  if (debugDoLess) {
    contents = [await lazyScriptTags[0](), await lazyScriptTags[1]()]
  }
  else {
    contents = await resolveAllOrInParallel(lazyScriptTags, { chunkLimit, chunkSize })
  }
  // console.log(contents.map(s => s.length <= 1000 ? s : s.length))
}

export const parseScriptsFromCordovaApps: AppsFolderParserFn = async (
  { allAppsPath, libsPath },
  {
    debugDoLess = false,
    conservative = true,
    chunkLimit = 2,
    chunkSize = 1,
  }: opts = {}) => {

  const apps = await getAppsAndSections({ allAppsPath })
  const lazyAppAnalysis = apps.map((app) => {
    return async () => parseScriptsFromCordovaApp({
      appPath: join(allAppsPath, app.section, app.app),
      libsPath,
    }, { conservative })
  })
  if (debugDoLess) {
    await Promise.all([
      lazyAppAnalysis[0](),
      lazyAppAnalysis[1](),
    ])
  }
  else {
    await resolveAllOrInParallel(lazyAppAnalysis, { chunkLimit, chunkSize })
  }
}
