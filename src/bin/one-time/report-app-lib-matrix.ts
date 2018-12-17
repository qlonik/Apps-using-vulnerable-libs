import { readdir, readJSON, writeFile } from 'fs-extra'
import { concat, filter, findIndex, flow, isEqual, map } from 'lodash/fp'
import { join } from 'path'
import { appDesc, getAnalysedData, getAnalysisFiles } from '../../parseApps'
import { FINISHED_ANALYSIS_FILE } from '../../parseApps/constants'
import { getLibNameVersions, libNameVersion } from '../../parseLibraries'
import { SerializableRankType } from '../../similarityIndex'
import { isNonNullable } from '../../utils'
import { MainFn, TerminateFn } from '../_all.types'
import { addMissing, liftFn, matrixToCSV } from '../../utils/functional'

const EXACT_VULN_FILENAME = 'app-lib-vuln-exact.csv'
const PARTIAL_VULN_FILENAME = 'app-lib-vuln-partial.csv'

const serializableRankTypeMapper: (x: SerializableRankType[]) => libNameVersion[] = flow(
  map(
    ({ matches }) =>
      matches.length === 0 ? null : { name: matches[0].name, version: matches[0].version },
  ),
  filter(isNonNullable) as any,
)

export const environment = {
  APPS_PATH: {},
  LIBS_PATH: {},
}

export const main: MainFn<typeof environment> = async function main(
  log,
  { OUT, APPS_PATH, LIBS_PATH },
) {
  const CSV_EXACT_LIB_REPORT = join(OUT, EXACT_VULN_FILENAME)
  const CSV_PARTIAL_LIB_REPORT = join(OUT, PARTIAL_VULN_FILENAME)
  const allNVs = await getLibNameVersions(LIBS_PATH)

  const appDirsHosts = await readdir(APPS_PATH)
  const appResults = await appDirsHosts.reduce(async (acc, host) => {
    const aw = await acc

    const appsPath = join(APPS_PATH, host)
    const finApps = (await readJSON(join(appsPath, FINISHED_ANALYSIS_FILE))) as appDesc[]
    const finAppsPromises = finApps.map(async (app) => {
      const files = await getAnalysisFiles(appsPath, app)
      const an = await getAnalysedData(appsPath, app, files)

      const [exact, partial, ex_part] = flow(
        (x: typeof an) => x.map(({ similarity }) => similarity),
        (x) => x.filter(isNonNullable),
        (x) =>
          x.map(({ rank, secondary }) => [
            serializableRankTypeMapper(rank),
            serializableRankTypeMapper(secondary),
            serializableRankTypeMapper(concat(rank, secondary)),
          ]),
        (x) =>
          x.reduce(liftFn(addMissing), [
            [] as libNameVersion[],
            [] as libNameVersion[],
            [] as libNameVersion[],
          ]),
      )(an)

      return { app, exact, partial, ex_part }
    })

    return aw.concat(await Promise.all(finAppsPromises))
  }, Promise.resolve([] as ({ app: appDesc; exact: libNameVersion[]; partial: libNameVersion[]; ex_part: libNameVersion[] })[]))

  log.info({ appResults }, 'results for all apps')

  const exactMatrixContent = map(
    ({ app: { type, section, app }, exact }) =>
      concat(
        `${type}/${section}/${app}`,
        map((nv) => (findIndex(isEqual(nv), exact) !== -1 ? '1' : '0'), allNVs),
      ),
    appResults,
  )
  const exactMatrix = concat(
    [concat('', allNVs.map(({ name, version }) => `${name}@${version}`))],
    exactMatrixContent,
  )

  const partialMatrixContent = map(
    ({ app: { type, section, app }, partial }) =>
      concat(
        `${type}/${section}/${app}`,
        map((nv) => (findIndex(isEqual(nv), partial) !== -1 ? '1' : '0'), allNVs),
      ),
    appResults,
  )
  const partialMatrix = concat(
    [concat('', allNVs.map(({ name, version }) => `${name}@${version}`))],
    partialMatrixContent,
  )

  log.info({ exactMatrix }, 'exact data matrix')
  log.info({ partialMatrix }, 'partial data matrix')

  const exactCsv = matrixToCSV(exactMatrix)
  const partialCsv = matrixToCSV(partialMatrix)

  await writeFile(CSV_EXACT_LIB_REPORT, exactCsv, 'utf-8')
  await writeFile(CSV_PARTIAL_LIB_REPORT, partialCsv, 'utf-8')
}

export const terminate: TerminateFn = () => () => {}
