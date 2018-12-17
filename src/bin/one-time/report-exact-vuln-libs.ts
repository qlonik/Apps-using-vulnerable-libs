import { readJSON } from 'fs-extra'
import { join } from 'path'
import {
  analysisFile,
  APP_TYPES,
  appDesc,
  getAnalysedData,
  getCordovaAnalysisFiles,
  getReactNativeAnalysisFiles,
} from '../../parseApps'
import { FINISHED_ANALYSIS_FILE as FIN_ANALYSIS_FILE } from '../../parseApps/constants'
import { assertNever } from '../../utils'
import { MainFn, TerminateFn } from '../_all.types'

const APPS_SUBSECTIONS = [
  'sample_apps.tick1',
  'sample_apps.tick2',
  'sample_apps.tick3',
  'sample_apps.tick4',
  'sample_apps.tick5',
]

export const environment = {
  ALL_APPS: {},
}

export const main: MainFn<typeof environment> = async function main(log, { ALL_APPS }) {
  const matchesMap = new Map<string, { exact: any[]; partial: any[]; ex_part: any[] }>()

  for (let appSubsection of APPS_SUBSECTIONS) {
    const appsPath = join(ALL_APPS, appSubsection)
    const finApps = (await readJSON(join(appsPath, FIN_ANALYSIS_FILE))) as appDesc[]

    for (let app of finApps) {
      const appS = `${app.type}/${app.section}/${app.app}`
      const appDetected = matchesMap.get(appS) || { exact: [], partial: [], ex_part: [] }

      const anFiles: analysisFile[] =
        app.type === APP_TYPES.cordova
          ? await getCordovaAnalysisFiles(appsPath, app)
          : app.type === APP_TYPES.reactNative
            ? await getReactNativeAnalysisFiles(appsPath, app)
            : assertNever(app.type)

      const results = await getAnalysedData(appsPath, app, anFiles)
      for (let { file, similarity } of results) {
        if (similarity === null) {
          continue
        }

        const { rank, secondary } = similarity
        for (let el of rank) {
          if (el.matches.length > 0) {
            const { name, version } = el.matches[0]
            appDetected.exact.push({ file: file.path, name, version })
          }
        }
        for (let el of secondary) {
          if (el.matches.length > 0) {
            const { name, version } = el.matches[0]
            appDetected.partial.push({ file: file.path, name, version })
          }
        }
        for (let el of rank.concat(secondary)) {
          if (el.matches.length > 0) {
            const { name, version } = el.matches[0]
            appDetected.ex_part.push({ file: file.path, name, version })
          }
        }
      }

      matchesMap.set(appS, appDetected)
    }
  }

  log.info({ matches: [...matchesMap.entries()] })
}

export const terminate: TerminateFn = () => () => {}
