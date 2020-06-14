import { outputJSON } from 'fs-extra'
import { join } from 'path'
import R from 'ramda'
import {
  analysedDataFile,
  APP_TYPES,
  appDesc,
  cordovaAnalysisFile,
  getAnalysedData,
  getApps,
  getCordovaAnalysisFiles,
} from '../../parseApps'
import { libNameVersionSigFile } from '../../parseLibraries'
import { SerializableRankType } from '../../similarityIndex'
import { FN_MATCHING_METHODS_TYPE } from '../../similarityIndex/similarity-methods'
import { resolveAllOrInParallel as resolve } from '../../utils'
import { MainFn, TerminateFn } from '../_all.types'

const ORDERED_METHODS: FN_MATCHING_METHODS_TYPE[] = [
  'fn-st-toks-v6',
  'fn-names-our',
  'fn-st-types',
  'fn-names-st-toks',
  'fn-names-jaccard',
  'fn-st-toks-v5',
  'fn-st-toks-v4',
  'fn-st-toks-v3',
  'fn-st-toks-v2',
  'fn-st-toks-v1',
]

export const environment = {
  ALL_RESULTS: {},
}

const encodeMatch = ({ name, version, file }: libNameVersionSigFile) => `${name}@${version}@${file}`
const encodeApp = ({ type, section, app }: appDesc) => `${type}@${section}@${app}`
const transformRank = R.reduce(
  (acc, { matches }: SerializableRankType) =>
    matches.length === 0 ? acc : acc.concat(encodeMatch(matches[0])),
  [] as string[],
)
const prependPathToMatches = (path: string) => R.map((match: string) => `${path}:${match}`)
const transformFiles = R.reduce(
  (acc, { file, similarity }: analysedDataFile<cordovaAnalysisFile>) =>
    !similarity ? acc : acc.concat(prependPathToMatches(file.path)(transformRank(similarity.rank))),
  [] as string[],
)
const prependAppToFiles = (app: appDesc) => {
  const encoded = encodeApp(app)
  return R.map((e: string) => `${encoded}:${e}`)
}

export const main: MainFn<typeof environment> = async function main(log, { ALL_RESULTS, OUT }) {
  const dirsMethods = ORDERED_METHODS.map((method) => ({
    method,
    dir: join(ALL_RESULTS, `tick3.${method}`),
  }))

  const data = await resolve(
    dirsMethods.map(({ method, dir }) => async () => {
      const apps = (await getApps(dir, APP_TYPES.cordova)) as appDesc<APP_TYPES.cordova>[]
      const filteredApps = apps.filter(
        ({ app }) =>
          app !== 'com.zousan.santahelp-78-2016_12_13.apk' &&
          app !== 'apps.yclients88759-10300-2017_04_13.apk',
      )
      const appFiles = await resolve(
        filteredApps.map((app) => async () => ({
          app,
          files: await getCordovaAnalysisFiles(dir, app),
        })),
      )
      const analysedFiles = await resolve(
        appFiles.map(({ app, files }) => async () => ({
          app,
          files: await getAnalysedData(dir, app, files),
        })),
      )

      const exactMatchesPerApp = analysedFiles.reduce(
        (acc, { app, files }) => acc.concat(prependAppToFiles(app)(transformFiles(files))),
        [] as string[],
      )

      return { method, matches: exactMatchesPerApp }
    }),
  )

  const reduced = data.reduce(
    (acc, { method, matches }) => ({ ...acc, [method]: matches }),
    {} as Record<FN_MATCHING_METHODS_TYPE, string[]>,
  )

  log.info({ reduced }, 'all detected matches')
  await outputJSON(join(OUT, 'reduced.json'), reduced)
}

export const terminate: TerminateFn = () => () => {}
