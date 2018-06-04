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
import { analysisFile, appDesc, appPath, getApps } from '../parseApps'
import { FINISHED_SEARCH_FILE } from '../parseApps/constants'
import { resolveAllOrInParallel } from '../utils'
import { myWriteJSON } from '../utils/files'
import logger from '../utils/logger'
import { getWorkerPath, poolFactory } from '../utils/worker'

const OUT = process.env.OUT!
const APPS_PATH = '../data/sample_apps'
const APPS_TO_SEARCH_LIMIT = 100
const SECTIONS = 10
const FIN_SEARCH_APPS_PATH = join(APPS_PATH, FINISHED_SEARCH_FILE)

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
      [{ APPS_PATH: string; app: appDesc; section: number; SECTIONS: number }],
      foundNpmMentionsMap | false
    ]
  }
>

const log = logger.child({ name: 'find-lib-mentions' })
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

export async function main() {
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
      pool.exec('findNpmMentions', [{ app, APPS_PATH, section: s, SECTIONS }]),
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
    chunkLimit: pool.maxWorkers + 1,
    chunkSize: Math.floor(1.5 * pool.maxWorkers),
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

export const terminate = once(() => {
  log.info('started terminating')
  terminating = true
})
