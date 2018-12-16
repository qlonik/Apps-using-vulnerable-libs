import { execFile } from 'child_process'
import { mkdirp, pathExists, readJSON } from 'fs-extra'
import { find, findIndex, flow, isEqual, map, partition, uniq } from 'lodash/fp'
import { join } from 'path'
import { satisfies, valid, validRange } from 'semver'
import { promisify } from 'util'
import { libNameVersion } from '../parseLibraries'
import { loAsync, resolveAllOrInParallel } from '../utils'
import { myWriteJSON } from '../utils/files'
import { MainFn } from './_all.types'

// todo
const SNYK_JSON_PATH = './src/manual-reports/snyk/npm-full-v2.json'

export interface SnykVuln {
  title: string
  credit: string[]
  moduleName: string
  packageName: string
  language: 'js'
  packageManager: 'npm'
  description: string
  identifiers: {
    NSP: number
    CWE: string[]
    CVE: string[]
    ALTERNATIVE: string[]
  }
  semver: {
    vulnerable: string[]
    unaffected: string[]
  }
  severity: 'low' | 'medium' | 'high'
  cvssScore: number
  CVSSv3: string
  patches: {
    urls: string[]
    version: string
    modificationTime: string
    comments: string[]
    id: string
  }[]
  creationTime: string
  modificationTime: string
  publicationTime: string
  disclosureTime: string
  id: string
  alternativeIds: string[]
}
export interface SnykDB {
  npm: {
    [libName: string]: SnykVuln[]
  }
}
interface NpmDBEntry {
  name: string
  versions: string[]
}

const computeAllAffectedVersions = (vulns: SnykVuln[]) =>
  vulns.reduce((acc, vuln) => (acc ? acc + ' || ' : '') + vuln.semver.vulnerable.join(' || '), '')

const buildLibVersionList = (snyk: SnykDB): { [name: string]: string } =>
  Object.entries(snyk.npm).reduce(
    (acc, [name, vulns]) => ({ ...acc, [name]: computeAllAffectedVersions(vulns) }),
    {},
  )

const notInArray = <T>(arr: T[]) => (el: T) => findIndex(isEqual(el), arr) === -1
const exec = promisify(execFile)
const mapNVToLazyNV = (dump: string) =>
  map(({ name, version }: libNameVersion) => async () => {
    const cwd = join(dump, name)
    await mkdirp(cwd)
    try {
      await exec('npm', ['pack', `${name}@${version}`], { cwd })
      return { done: true, name, version }
    } catch {
      return { done: false, name, version }
    }
  })

export const environment = {
  /**
   * Location of CouchDB dump file, formatted with "couch-dump-format" script.
   *
   * @example
   *   // note that the following file is formatted, but it has filename
   *   // corresponding to the not formatted file.
   *   './data/logs/LOCAL/npm-db-dump/moone/2018-05-17T01:51:56.034Z/liblibNamesVersions.json'
   *
   *   // following file has different format
   *   // it cannot be used
   *   './data/logs/RIPPLE/npm-db-dump/click0/2018-07-10T07:18:54.941Z/formatted-liblibNamesVersions.json'
   */
  NPM_DB_DUMP_PATH: {},
  /**
   * Location where tgz are dumped
   *
   * @example
   *   './data/libs/snyk/dump'
   */
  DOWNLOAD_PATH: {},
}

export const main: MainFn<typeof environment> = async (
  log,
  { NPM_DB_DUMP_PATH, DOWNLOAD_PATH: DOWNLOADED_PATH },
) => {
  const DOWNLOADED_LIBS_FILE = join(DOWNLOADED_PATH, '_file.json')

  const vulnVersionRanges = buildLibVersionList((await readJSON(SNYK_JSON_PATH)) as SnykDB)
  log.info('snyk db is loaded')
  for (let [name, range] of Object.entries(vulnVersionRanges)) {
    if (!validRange(range)) {
      log.warn({ 'lib-name': name, range }, 'created invalid range')
    }
  }

  const npmDb = (await readJSON(NPM_DB_DUMP_PATH)) as NpmDBEntry[]
  log.info('npm db is loaded')
  const npmDbNames = npmDb.map(({ name }) => name)
  if (uniq(npmDbNames).length !== npmDbNames.length) {
    log.warn('not all names in the npm db are unique')
  }

  let finVersions = [] as libNameVersion[]
  if (await pathExists(DOWNLOADED_LIBS_FILE)) {
    finVersions = (await readJSON(DOWNLOADED_LIBS_FILE)) as libNameVersion[]
    log.info('finished versions file is loaded')
  }

  const nvs = await Object.entries(vulnVersionRanges).reduce(async (acc, [name, range]) => {
    const w = await acc
    const foundNV = find((npmDb) => name === npmDb.name, npmDb)
    if (!foundNV) {
      log.warn({ 'lib-name': name }, 'lib from snyk db is not found in npm db')
      return w
    }

    const vs = foundNV.versions
      .filter((v) => valid(v) && satisfies(v, range))
      .map((version) => ({ name, version }))
      .filter(notInArray(finVersions))
    return w.concat(vs)
  }, Promise.resolve([] as libNameVersion[]))

  const [s, f] = await flow(
    mapNVToLazyNV(DOWNLOADED_PATH),
    resolveAllOrInParallel,
    loAsync(partition(({ done }) => done)),
    loAsync(map(map(({ name, version }) => ({ name, version })))),
  )(nvs)

  await mkdirp(DOWNLOADED_PATH)
  await myWriteJSON({ file: DOWNLOADED_LIBS_FILE, content: finVersions.concat(s) })

  log.info('updated downloaded libs file')
  log.error({ failed: f }, 'libraries failed: %o', f.length)
}
