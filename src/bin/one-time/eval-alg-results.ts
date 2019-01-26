import { oneLine } from 'common-tags'
import { pathExists, readJSON } from 'fs-extra'
import differenceWith from 'lodash/fp/differenceWith'
import find from 'lodash/fp/find'
import isEqual from 'lodash/fp/isEqual'
import partition from 'lodash/fp/partition'
import sortBy from 'lodash/fp/sortBy'
import round from 'lodash/round'
import { join } from 'path'
import { Logger } from 'pino'
import {
  appsAnalysed,
  CordovaManualAnalysisReport,
  match as ManualMatch,
  ReactNativeManualAnalysisReport,
} from '../../manual-reports/identified-apps'
import {
  analysisFile,
  APP_TYPES,
  appDesc,
  getAnalysedData,
  isCordovaAnalysisFile,
  isReactNativeAnalysisFile,
} from '../../parseApps'
import { FINISHED_ANALYSIS_FILE } from '../../parseApps/constants'
import { getLibNameVersions, libNameVersion } from '../../parseLibraries'
import { BundleSimFnReturn, SerializableRankType } from '../../similarityIndex'
import { divByZeroIsZero, indexValue } from '../../similarityIndex/set'
import { FN_MATCHING_METHODS } from '../../similarityIndex/similarity-methods'
import { assertNever } from '../../utils'
import { assert } from '../../utils/logger'
import { MainFn, TerminateFn } from '../_all.types'

async function loadRankData(log: Logger, APPS_PATH: string, app: appDesc, file: analysisFile) {
  if (app.type === APP_TYPES.cordova) {
    if (!isCordovaAnalysisFile(file)) {
      throw assert(false, log, 'file from cordova app is not in cordova format')
    }
  } else if (app.type === APP_TYPES.reactNative) {
    if (!isReactNativeAnalysisFile(file)) {
      throw assert(false, log, 'file from react-native app is not in react-native format')
    }
  } else {
    throw assertNever(app.type)
  }

  const analysedData = await getAnalysedData(APPS_PATH, app, file)
  return analysedData.similarity
}

type TopMatch = {
  name: SerializableRankType['name']
  candidateRanking: SerializableRankType['top']
  candidateRankingProb: SerializableRankType['index']
  version: SerializableRankType['matches'][0]['version']
  file: SerializableRankType['matches'][0]['file']
  similarity: SerializableRankType['matches'][0]['similarity']
}
const filterNull = <T>(x: T): x is Exclude<T, null | undefined> => x !== null && x !== undefined
const getTopMatchMap = (arr: SerializableRankType[]): TopMatch[] =>
  arr
    .map((rank: SerializableRankType) => {
      const topMatch = rank.matches[0]
      if (!topMatch) {
        return null
      }
      return {
        name: rank.name,
        candidateRanking: rank.top,
        candidateRankingProb: rank.index,
        version: topMatch.version,
        file: topMatch.file,
        similarity: topMatch.similarity,
      }
    })
    .filter(filterNull)

type NVMap = {
  [name: string]:
    | undefined
    | {
        [version: string]: undefined | true
      }
}
const turnNVsIntoMap = (libs: libNameVersion[]) =>
  libs.reduce(
    (acc, { name, version }) => ({
      ...acc,
      [name]: {
        ...(acc[name] || {}),
        [version]: true as true,
      },
    }),
    {} as NVMap,
  )
const nameIsInNVsMapFactory = (map: NVMap) => (name: string) => !!map[name]
const nameVersionIsInNVsMapFactory = (map: NVMap) => {
  const nameIsInNV = nameIsInNVsMapFactory(map)
  return (name: string, version: string) => nameIsInNV(name) && !!map[name]![version]
}

const emptyTypeReport = () => ({
  files: {
    totalFiles: 0,
    noSimForFile: 0,
  },
  manual: {
    libsDetected: 0,
    libsGuesses: 0,
    libsNotGuesses: 0,
    libNamesNotInVulnDB: 0,
    libNamesInVulnDB: 0,
    libNamesInVulnDBInstances: [] as string[],
    libNamesVersionsNotInVulnDB: 0,
    libNamesVersionsInVulnDB: 0,
    libNamesVersionsInVulnDBInstances: [] as string[],
  },

  alg: {
    'top-found-name': 0,
    'top-found-name-version': 0,
    'sec-found-name': 0,
    'sec-found-name-version': 0,
  },

  stat: {
    'found-name-in-top': {} as indexValue,
    'found-name-in-top-sec': {} as indexValue,
    'found-name-version-in-top': {} as indexValue,
    'found-name-version-in-top-sec': {} as indexValue,
  },

  matches: {
    'top-name-map': [] as string[],
    'top-name-version-map': [] as string[],
    'sec-name-map': [] as string[],
    'sec-name-version-map': [] as string[],
    missed: [] as string[],
  },
})

const encodeMatch = (
  app: appDesc,
  fileDescriptor: { path: string },
  _m: ManualMatch,
  match?: TopMatch,
): string => {
  const formatIndexValue = (prob: indexValue) =>
    oneLine`
      {
        val: ${round(prob.val, 4)},
        num: ${prob.num},
        den: ${prob.den}
      }
    `

  let matchTo = ''
  if (match) {
    matchTo = oneLine`
      =>
      ${match.name}__${match.version}__${match.file}
      can(rank: ${match.candidateRanking}, ${formatIndexValue(match.candidateRankingProb)})
      sim(${formatIndexValue(match.similarity)})
    `
  }

  return oneLine`
    ${app.type}/${app.section}/${app.app}:${fileDescriptor.path}
    :::
    ${_m.name}__${_m.version || '???'}__${_m.file || '???'}
    ${matchTo}
  `
}

export const environment = {
  APPS_PATH: {},
  LIBS_PATH: {},
}

export const main: MainFn<typeof environment> = async function main(log, { APPS_PATH, LIBS_PATH }) {
  const manuallyAnalysedApps = [...Object.values(appsAnalysed)].map((report) => report.app)

  const libNVs = await getLibNameVersions(LIBS_PATH)
  const NVsMap = turnNVsIntoMap(libNVs)
  const nameIsInNVs = nameIsInNVsMapFactory(NVsMap)
  const nameVersionIsInNVs = nameVersionIsInNVsMapFactory(NVsMap)

  const totalReport = {} as { [type: string]: ReturnType<typeof emptyTypeReport> }

  for (let type of FN_MATCHING_METHODS) {
    if (type !== 'fn-st-toks-v6') {
      continue
    }
    const typeLog = log.child({ 'sim-method': type })

    const TYPE_APPS_PATH = join(APPS_PATH, type)
    const FIN_AN_APPS_PATH = join(TYPE_APPS_PATH, FINISHED_ANALYSIS_FILE)
    if (!(await pathExists(FIN_AN_APPS_PATH))) {
      typeLog.warn('analysis using this similarity method was not performed')
      continue
    }

    const finAnalysisApps = (await readJSON(FIN_AN_APPS_PATH)) as appDesc[]
    const notAnalysedApps = differenceWith(isEqual, manuallyAnalysedApps, finAnalysisApps)
    if (notAnalysedApps.length > 0) {
      typeLog.info(
        { 'not-analysed-apps': notAnalysedApps },
        'apps in golden set which were not analysed',
      )
    }

    const manualResultsReport = emptyTypeReport()

    for (let app of differenceWith(isEqual, manuallyAnalysedApps, notAnalysedApps)) {
      const report = appsAnalysed[`${app.type}/${app.section}/${app.app}`]
      const filesReports = Object.values(report.files) as
        | CordovaManualAnalysisReport['files'][string][]
        | ReactNativeManualAnalysisReport['files'][string][]

      for (let file of filesReports) {
        const fileDescriptor =
          'location' in file && 'id' in file
            ? { path: `${file.location}/${file.id}`, location: file.location, id: file.id }
            : 'idType' in file && 'id' in file
            ? { path: `${file.idType}_${file.id}`, idType: file.idType, id: file.id }
            : assertNever(file)
        const fileLog = typeLog.child({ app, 'file-path': fileDescriptor })

        let matchData: ManualMatch[] = []
        let anData: BundleSimFnReturn | null = null

        if (file.type === 'business-logic' || file.type === 'http-script') {
          continue
        } else if (file.type === 'unknown' || file.type === '') {
          continue
        } else if (file.type === 'single-lib') {
          matchData = [file.match]
          anData = await loadRankData(fileLog, TYPE_APPS_PATH, app, fileDescriptor)
        } else if (file.type === 'bundle') {
          matchData = file.match
          anData = await loadRankData(fileLog, TYPE_APPS_PATH, app, fileDescriptor)
        } else {
          assertNever(file.type)
          continue
        }

        const [matchDataGuess, matchDataNonGuess] = partition((m) => m.isGuess, matchData)
        const [matchDataNamesInVuln, matchDataNamesNotInVuln] = partition(
          (m) => nameIsInNVs(m.name),
          matchDataNonGuess,
        )
        const [matchDataNamesVersionsInVuln, matchDataNamesVersionsNotInVuln] = partition(
          (m) => nameVersionIsInNVs(m.name, m.version || '???'),
          matchDataNamesInVuln,
        )

        manualResultsReport.manual.libsDetected += matchData.length
        manualResultsReport.manual.libsGuesses += matchDataGuess.length
        manualResultsReport.manual.libsNotGuesses += matchDataNonGuess.length
        manualResultsReport.manual.libNamesNotInVulnDB += matchDataNamesNotInVuln.length
        manualResultsReport.manual.libNamesInVulnDB += matchDataNamesInVuln.length
        manualResultsReport.manual.libNamesVersionsNotInVulnDB +=
          matchDataNamesVersionsNotInVuln.length
        manualResultsReport.manual.libNamesVersionsInVulnDB += matchDataNamesVersionsInVuln.length

        for (let _m of matchDataNamesInVuln) {
          manualResultsReport.manual.libNamesInVulnDBInstances.push(
            encodeMatch(app, fileDescriptor, _m),
          )
        }
        for (let _m of matchDataNamesVersionsInVuln) {
          manualResultsReport.manual.libNamesVersionsInVulnDBInstances.push(
            encodeMatch(app, fileDescriptor, _m),
          )
        }

        manualResultsReport.files.totalFiles += 1
        if (anData === null) {
          manualResultsReport.files.noSimForFile += 1
          continue
        }

        const topMatches = getTopMatchMap(anData.rank)
        const secondaryMatches = getTopMatchMap(anData.secondary)

        for (let _m of matchDataNamesInVuln) {
          const topFoundMatch = find((el) => el.name === _m.name, topMatches)
          const foundInSecondary = find((el) => el.name === _m.name, secondaryMatches)
          const nvInVuln = _m.version && nameVersionIsInNVs(_m.name, _m.version)

          if (topFoundMatch !== undefined) {
            const encMatch = encodeMatch(app, fileDescriptor, _m, topFoundMatch)

            manualResultsReport.alg['top-found-name'] += 1
            manualResultsReport.matches['top-name-map'].push(encMatch)
            if (nvInVuln && _m.version === topFoundMatch.version) {
              manualResultsReport.alg['top-found-name-version'] += 1
              manualResultsReport.matches['top-name-version-map'].push(encMatch)
            }
          } else if (foundInSecondary !== undefined) {
            const encMatch = encodeMatch(app, fileDescriptor, _m, foundInSecondary)

            manualResultsReport.alg['sec-found-name'] += 1
            manualResultsReport.matches['sec-name-map'].push(encMatch)
            if (nvInVuln && _m.version === foundInSecondary.version) {
              manualResultsReport.alg['sec-found-name-version'] += 1
              manualResultsReport.matches['sec-name-version-map'].push(encMatch)
            }
          } else {
            const encMatch = encodeMatch(app, fileDescriptor, _m)
            manualResultsReport.matches.missed.push(encMatch)
          }
        }
      }
    }

    let num
    let den

    num = manualResultsReport.alg['top-found-name']
    den = manualResultsReport.manual.libNamesInVulnDB
    manualResultsReport.stat['found-name-in-top'] = {
      val: divByZeroIsZero(num, den),
      num,
      den,
    }

    num = manualResultsReport.alg['top-found-name'] + manualResultsReport.alg['sec-found-name']
    den = manualResultsReport.manual.libNamesInVulnDB
    manualResultsReport.stat['found-name-in-top-sec'] = {
      val: divByZeroIsZero(num, den),
      num,
      den,
    }

    num = manualResultsReport.alg['top-found-name-version']
    den = manualResultsReport.manual.libNamesVersionsInVulnDB
    manualResultsReport.stat['found-name-version-in-top'] = {
      val: divByZeroIsZero(num, den),
      num,
      den,
    }

    num =
      manualResultsReport.alg['top-found-name-version'] +
      manualResultsReport.alg['sec-found-name-version']
    den = manualResultsReport.manual.libNamesVersionsInVulnDB
    manualResultsReport.stat['found-name-version-in-top-sec'] = {
      val: divByZeroIsZero(num, den),
      num,
      den,
    }

    totalReport[type] = manualResultsReport
  }

  const totalReportSorted = sortBy<[string, ReturnType<typeof emptyTypeReport>]>(
    ([, value]) => value.stat['found-name-in-top'].val,
    [...Object.entries(totalReport)],
  ).reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {} as typeof totalReport)

  log.info(totalReportSorted, 'report')
}

export const terminate: TerminateFn = function terminate() {
  return () => {}
}
