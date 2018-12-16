import { execFile } from 'child_process'
import { mkdirp, pathExists, readFile, readJSON } from 'fs-extra'
import { find, findIndex, flow, isEqual, map, partition, take, uniq } from 'lodash/fp'
import { join } from 'path'
import { valid } from 'semver'
import { promisify } from 'util'
import { libNameVersion } from '../parseLibraries'
import { loAsync, resolveAllOrInParallel } from '../utils'
import { myWriteJSON } from '../utils/files'
import { MainFn } from './_all.types'

const LIMIT = 100
const REGEX = /\d+\.\s\[(.*)]\(.*\).*/

interface NpmDBEntry {
  name: string
  versions: string[]
}

const notInArray = <T>(arr: T[]) => (el: T) => findIndex(isEqual(el), arr) === -1
const extractName = (reg: RegExp) => (s: string): null | string => {
  const m = s.match(reg)
  return m && m[1].trim()
}
const buildTopNamesList = (topList: string): string[] =>
  take(
    LIMIT,
    topList
      .split('\n')
      .map(extractName(REGEX))
      .filter((l): l is NonNullable<typeof l> => !!l),
  )

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
   * @example ```js
   *
   *   // note that the following file is formatted, but it has filename
   *   // corresponding to the not formatted file.
   *   const NPM_DB_DUMP_PATH = './data/logs/LOCAL/npm-db-dump/moone/2018-05-17T01:51:56.034Z/liblibNamesVersions.json'
   *
   *   // following file has different format
   *   // it cannot be used
   *   const NPM_DB_DUMP_PATH = './data/logs/RIPPLE/npm-db-dump/click0/2018-07-10T07:18:54.941Z/formatted-liblibNamesVersions.json'
   * ```
   */
  NPM_DB_DUMP_PATH: {},
  /**
   * Location where tgz are dumped
   *
   * @example
   *   './data/libs/top100/dump'
   */
  TGZ_DUMP: {},
  /**
   * Location of top 01.most-dependent-upon.md
   *
   * @example
   *   './data/npm_rank/01.most-dependent-upon.md'
   */
  TOP_LIST_FILE: {},
}

export const main: MainFn<typeof environment> = async function main(
  log,
  { NPM_DB_DUMP_PATH, TOP_LIST_FILE, TGZ_DUMP },
) {
  const VERSIONS_FILE = join(TGZ_DUMP, '_file.json')

  const topList = buildTopNamesList(await readFile(TOP_LIST_FILE, 'utf-8'))
  log.info('top-100 list is loaded')

  const npmDb = (await readJSON(NPM_DB_DUMP_PATH)) as NpmDBEntry[]
  log.info('npm db is loaded')
  const npmDbNames = npmDb.map(({ name }) => name)
  if (uniq(npmDbNames).length !== npmDbNames.length) {
    log.warn('not all names in the npm db are unique')
  }

  let finVersions = [] as libNameVersion[]
  if (await pathExists(VERSIONS_FILE)) {
    finVersions = (await readJSON(VERSIONS_FILE)) as libNameVersion[]
    log.info('finished versions file is loaded')
  }

  const topListMetadataAll = await topList.reduce(async (acc, name) => {
    const w = await acc
    const foundNV = find((npmDb) => name === npmDb.name, npmDb)
    if (!foundNV) {
      log.warn({ 'lib-name': name }, 'lib from top-100 list is not found in npm db')
      return w
    }

    const vs = foundNV.versions
      .filter((v) => valid(v))
      .map((version) => ({ name, version }))
      .filter(notInArray(finVersions))
    return w.concat(vs)
  }, Promise.resolve([] as libNameVersion[]))

  const [s, f] = await flow(
    mapNVToLazyNV(TGZ_DUMP),
    resolveAllOrInParallel,
    loAsync(partition(({ done }) => done)),
    loAsync(map(map(({ name, version }) => ({ name, version })))),
  )(topListMetadataAll)

  await mkdirp(TGZ_DUMP)
  await myWriteJSON({ file: VERSIONS_FILE, content: finVersions.concat(s) })

  log.info('updated downloaded libs file')
  log.error({ failed: f }, 'libraries failed: %o', f.length)
}
