import { pathExists, readJSON } from 'fs-extra'
import differenceWith from 'lodash/fp/differenceWith'
import includes from 'lodash/fp/includes'
import isEqual from 'lodash/fp/isEqual'
import once from 'lodash/fp/once'
import partition from 'lodash/fp/partition'
import shuffle from 'lodash/fp/shuffle'
import sortBy from 'lodash/fp/sortBy'
import take from 'lodash/fp/take'
import { join } from 'path'
import { The } from 'typical-mini'
import { MessagesMap } from 'workerpool'
import { analysisFile, appDesc, getApps } from '../parseApps'
import {
  FINISHED_SEARCH_FILE,
  FOUND_LIBS_FILE,
  FOUND_LIBS_TOTALS_FILE,
} from '../parseApps/constants'
import { resolveAllOrInParallel } from '../utils'
import { myWriteJSON } from '../utils/files'
import logger from '../utils/logger'
import { getWorkerPath, poolFactory } from '../utils/worker'

const OUT = process.env.OUT!
const APPS_PATH = '../data/sample_apps'
const APPS_TO_SEARCH_LIMIT = 100
const FIN_SEARCH_APPS_PATH = join(APPS_PATH, FINISHED_SEARCH_FILE)
const FOUND_LIBS = join(OUT, FOUND_LIBS_FILE)
const FOUND_LIBS_TOTALS = join(APPS_PATH, FOUND_LIBS_TOTALS_FILE)

export type regexLibs = [string, { count: number; versions: string[] }]
export type npmLibs = [string, { count: number }]
export type foundMentionsMap = {
  [path: string]: {
    file: analysisFile
    regexLibs: regexLibs[]
    npmLibs: npmLibs[]
  }
}
export type messages = The<
  MessagesMap,
  {
    findLibMentions: [[{ APPS_PATH: string; app: appDesc }], foundMentionsMap | false]
  }
>

const log = logger.child({ name: 'find-lib-mentions' })
let terminating = false

type searchEl = appDesc & { found: messages['findLibMentions'][1] }
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
type totals = { reg: Map<regexLibs[0], regexLibs[1]>; npm: Map<npmLibs[0], npmLibs[1]> }
type totalsArr = { reg: regexLibs[]; npm: npmLibs[] }
const addTotals = ({ reg, npm }: totals, els: searchEl[]): totals => {
  for (let { found } of els) {
    if (typeof found === 'boolean') {
      continue
    }

    for (let key of Object.keys(found)) {
      const { regexLibs, npmLibs } = found[key]
      for (let [name, { count: foundCount, versions: foundVersions }] of regexLibs) {
        const { count, versions } = reg.get(name) || { count: 0, versions: [] }

        for (let foundVersion of foundVersions) {
          if (!includes(foundVersion, versions)) {
            versions.push(foundVersion)
          }
        }

        reg.set(name, { count: count + foundCount, versions })
      }
      for (let [name, { count: foundCount }] of npmLibs) {
        const { count } = npm.get(name) || { count: 0 }
        npm.set(name, { count: count + foundCount })
      }
    }
  }

  return { reg, npm }
}
const mapToArr = ({ reg, npm }: totals): totalsArr => {
  return {
    reg: sortBy((o) => -o[1].count, [...reg]),
    npm: sortBy((o) => -o[1].count, [...npm]),
  }
}

export async function main() {
  const pool = poolFactory<messages>(await getWorkerPath(__filename), {
    forkOpts: {
      execArgv: process.argv.concat(['--max-old-space-size=8192']),
    },
  })
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

  let TOTALS: totals = {
    reg: new Map<regexLibs[0], regexLibs[1]>(),
    npm: new Map<npmLibs[0], npmLibs[1]>(),
  }
  if (await pathExists(FOUND_LIBS_TOTALS)) {
    const { reg, npm } = (await readJSON(FOUND_LIBS_TOTALS)) as totalsArr
    TOTALS = { reg: new Map(reg), npm: new Map(npm) }
    log.info('loaded FOUND_LIBS_TOTALS')
  }

  const searchPromises = todo.map((app) => async (): Promise<searchEl> => {
    return {
      ...app,
      found: terminating
        ? false
        : ((await (pool.exec('findLibMentions', [
            { app, APPS_PATH },
          ]) /* returned promise is extended with .cancel() and .timeout() fns */ as any).timeout(
            60 * 60 * 1000,
          )) as messages['findLibMentions'][1]),
    }
  })

  let allSearchResults = [] as searchEl[]
  log.info('started search')
  const results = await resolveAllOrInParallel(searchPromises, {
    chunkLimit: pool.maxWorkers + 1,
    chunkSize: Math.floor(1.5 * pool.maxWorkers),
    chunkTapFn: async (els) => {
      const promises = []

      allSearchResults = allSearchResults.concat(els)
      promises.push(myWriteJSON({ file: FOUND_LIBS, content: allSearchResults }))

      finSearchApps = addFinishedApps(finSearchApps, els)
      promises.push(myWriteJSON({ file: FIN_SEARCH_APPS_PATH, content: finSearchApps }))

      TOTALS = addTotals(TOTALS, els)
      promises.push(myWriteJSON({ file: FOUND_LIBS_TOTALS, content: mapToArr(TOTALS) }))

      await Promise.all(promises)
    },
  })
  if (terminating) {
    log.info('terminated search')
  } else {
    log.info('finished search')
  }

  if (!isEqual(allSearchResults, results)) {
    log.warn(
      {
        'allSearchResults-results': differenceWith(isEqual, allSearchResults, results),
        'results-allSearchResults': differenceWith(isEqual, results, allSearchResults),
      },
      'allSearchResults !== results',
    )
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

  await myWriteJSON({ file: FOUND_LIBS_TOTALS, content: mapToArr(TOTALS) })
  log.info('updated FOUND_LIBS_TOTALS')

  await myWriteJSON({ file: FOUND_LIBS, content: results })
  await pool.terminate()
}

export const terminate = once(() => {
  log.info('started terminating')
  terminating = true
})
