import includes from 'lodash/fp/includes'
import once from 'lodash/fp/once'
import sortBy from 'lodash/fp/sortBy'
import { join } from 'path'
import { The } from 'typical-mini'
import { MessagesMap } from 'workerpool'
import { analysisFile, appDesc, getApps } from '../parseApps'
import { FOUND_LIBS_FILE, FOUND_LIBS_TOTALS_FILE } from '../parseApps/constants'
import { resolveAllOrInParallel } from '../utils'
import { myWriteJSON } from '../utils/files'
import logger from '../utils/logger'
import { getWorkerPath, poolFactory } from '../utils/worker'

const OUT = process.env.OUT!
const APPS_PATH = '../data/sample_apps'
const FOUND_LIBS = join(OUT, FOUND_LIBS_FILE)
const FOUND_LIBS_TOTALS = join(OUT, FOUND_LIBS_TOTALS_FILE)

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

export async function main() {
  const pool = poolFactory<messages>(await getWorkerPath(__filename), {
    forkOpts: {
      execArgv: process.argv.concat(['--max-old-space-size=8192']),
    },
  })
  log.info({ stats: pool.stats() }, 'pool: min=%o, max=%o', pool.minWorkers, pool.maxWorkers)

  const apps = await getApps(APPS_PATH)
  log.info('total apps: %o', apps.length)

  const searchPromises = apps.map((app) => async () => {
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

  let found = [] as any[]
  log.info('started search')
  const results = await resolveAllOrInParallel(searchPromises, {
    chunkLimit: pool.maxWorkers + 1,
    chunkSize: Math.floor(1.5 * pool.maxWorkers),
    chunkTapFn: async (els) => {
      found = found.concat(els)
      await myWriteJSON({ file: FOUND_LIBS, content: found })
    },
  })
  if (terminating) {
    log.info('terminated search')
  } else {
    log.info('finished search')
  }

  log.info('calculating totals')
  const regexTotals = new Map<regexLibs[0], regexLibs[1]>()
  const npmTotals = new Map<npmLibs[0], npmLibs[1]>()
  for (let { found } of results) {
    if (typeof found === 'boolean') {
      continue
    }

    for (let key of Object.keys(found)) {
      const { regexLibs, npmLibs } = found[key]
      for (let [name, { count: foundCount, versions: foundVersions }] of regexLibs) {
        const { count, versions } = regexTotals.get(name) || { count: 0, versions: [] }

        for (let foundVersion of foundVersions) {
          if (!includes(foundVersion, versions)) {
            versions.push(foundVersion)
          }
        }

        regexTotals.set(name, { count: count + foundCount, versions })
      }
      for (let [name, { count: foundCount }] of npmLibs) {
        const { count } = npmTotals.get(name) || { count: 0 }
        npmTotals.set(name, { count: count + foundCount })
      }
    }
  }
  const countSort = sortBy<regexLibs | npmLibs>((o) => -o[1].count)
  const totals = {
    regexTotals: countSort([...regexTotals]),
    npmTotals: countSort([...npmTotals]),
  }
  log.info('finished totals')

  await myWriteJSON({ file: FOUND_LIBS, content: results })
  await myWriteJSON({ file: FOUND_LIBS_TOTALS, content: totals })
  await pool.terminate()
}

export const terminate = once(() => {
  log.info('started terminating')
  terminating = true
})
