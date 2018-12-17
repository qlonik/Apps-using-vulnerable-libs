import { mkdirp, pathExists, readJSON } from 'fs-extra'
import differenceWith from 'lodash/fp/differenceWith'
import isEqual from 'lodash/fp/isEqual'
import mergeAllWith from 'lodash/fp/mergeAllWith'
import once from 'lodash/fp/once'
import partition from 'lodash/fp/partition'
import range from 'lodash/fp/range'
import shuffle from 'lodash/fp/shuffle'
import take from 'lodash/fp/take'
import uniqBy from 'lodash/fp/uniqBy'
import { join } from 'path'
import { The } from 'typical-mini'
import { MessagesMap } from 'workerpool'
import { analysisFile, appDesc, appPath, getApps } from '../../parseApps'
import { FINISHED_SEARCH_FILE } from '../../parseApps/constants'
import { resolveAllOrInParallel } from '../../utils'
import { myWriteJSON } from '../../utils/files'
import { getWorkerPath, poolFactory } from '../../utils/worker'
import { MainFn, TerminateFn } from '../_all.types'

// remark: see 5db51e7 for code calculating totals

const APPS_TO_SEARCH_LIMIT = 100
const SECTIONS = 50

export type regexLibs = [string, { count: number; versions: string[] }]
export type npmLibs = [string, { count: number }]
export type foundMentionsMap = {
  [path: string]: {
    file: analysisFile
    regexLibs: regexLibs[]
    npmLibs: npmLibs[]
  }
}
export type foundRegexMentionsMap = {
  [path: string]: {
    file: analysisFile
    regexLibs: regexLibs[]
  }
}
export type foundNpmMentionsMap = {
  [path: string]: {
    file: analysisFile
    npmLibs: npmLibs[]
  }
}
export type messages = The<
  MessagesMap,
  {
    findRegexMentions: [[{ APPS_PATH: string; app: appDesc }], foundRegexMentionsMap | false]
    findNpmMentions: [
      [
        {
          APPS_PATH: string
          app: appDesc
          section: number
          SECTIONS: number
          NPM_LIBS_PATH: string
        }
      ],
      foundNpmMentionsMap | false
    ]
  }
>

let terminating = false

type searchEl = appDesc & { found: boolean }
const addFinishedApps = (apps: appDesc[], els: searchEl[]): appDesc[] => {
  return apps
    .concat(
      els
        .filter(({ found }) => !!found)
        .map(({ type, section, app }): appDesc => ({ type, section, app })),
    )
    .sort((a, b) => {
      return `${a.type}/${a.section}/${a.app}`.localeCompare(`${b.type}/${b.section}/${b.app}`)
    })
}

export const environment = {
  APPS_PATH: {},
  /**
   * File contatining names and versions of libraries
   *
   * @example ```js
   *   // note this file has improper format and code will fail
   *   const NPM_LIBS_PATH = './data/logs/RIPPLE/npm-db-dump/click0/2018-05-17T01:51:56.034Z/liblibNamesVersions.json'
   * ```
   */
  NPM_LIBS_PATH: {},
}

export const main: MainFn<typeof environment> = async function main(
  log,
  { OUT, APPS_PATH, NPM_LIBS_PATH },
) {
  const FIN_SEARCH_APPS_PATH = join(APPS_PATH, FINISHED_SEARCH_FILE)
  const pool = poolFactory<messages>(await getWorkerPath(__filename))
  log.info({ stats: pool.stats() }, 'pool: min=%o, max=%o', pool.minWorkers, pool.maxWorkers)

  const apps = await getApps(APPS_PATH)
  let finSearchApps = [] as appDesc[]
  if (await pathExists(FIN_SEARCH_APPS_PATH)) {
    finSearchApps = await readJSON(FIN_SEARCH_APPS_PATH)
    log.info('loaded FIN_SEARCH_APPS')
  }
  const filtered = differenceWith(isEqual, apps, finSearchApps)
  const todo = take(APPS_TO_SEARCH_LIMIT, shuffle(filtered))
  log.info(
    'apps: (all=%o)-(fin=%o)=(todo=%o/%o)',
    apps.length,
    finSearchApps.length,
    todo.length,
    filtered.length,
  )

  const searchPromises = todo.map((app) => async (): Promise<searchEl> => {
    if (terminating) {
      return { ...app, found: false }
    }

    const findRegexPromise = pool.exec('findRegexMentions', [{ app, APPS_PATH }])
    const findNpmPromises = range(0, SECTIONS).map((s) =>
      pool.exec('findNpmMentions', [{ app, APPS_PATH, section: s, SECTIONS, NPM_LIBS_PATH }]),
    )

    const promises = ([] as Promise<any>[]).concat(findRegexPromise).concat(findNpmPromises)

    const result = (await Promise.all(promises)) as (
      | foundRegexMentionsMap
      | foundNpmMentionsMap
      | false)[]

    const merged: foundMentionsMap = mergeAllWith(
      (objValue, srcValue) =>
        Array.isArray(objValue) ? uniqBy(isEqual, objValue.concat(srcValue)) : undefined,
      result,
    )

    const p = appPath(join(OUT, 'apps'), app.type, app.section, app.app)
    await mkdirp(p)
    await myWriteJSON({ file: join(p, 'found.json'), content: merged })

    return { ...app, found: Object.keys(merged).length !== 0 }
  })

  log.info('started search')
  const results = await resolveAllOrInParallel(searchPromises, {
    chunkLimit: Math.floor(2 * pool.maxWorkers / SECTIONS),
    chunkSize: Math.floor(1.5 * pool.maxWorkers / SECTIONS),
    chunkTapFn: async (els) => {
      finSearchApps = addFinishedApps(finSearchApps, els)
      await myWriteJSON({ file: FIN_SEARCH_APPS_PATH, content: finSearchApps })
    },
  })
  if (terminating) {
    log.info('terminated search')
  } else {
    log.info('finished search')
  }

  const [done, notDone] = partition(({ found }) => !!found, results)
  const doneLength = done.length
  const notDoneLength = notDone.length

  log.info(
    'apps: (done=%o)+(not-done=%o)=(total=%o/%o)',
    doneLength,
    notDoneLength,
    doneLength + notDoneLength,
    filtered.length,
  )

  await myWriteJSON({ file: FIN_SEARCH_APPS_PATH, content: finSearchApps })
  log.info('updated FIN_SEARCH_APPS')

  await pool.terminate()
}

export const terminate: TerminateFn = (log) =>
  once(() => {
    log.info('started terminating')
    terminating = true
  })
