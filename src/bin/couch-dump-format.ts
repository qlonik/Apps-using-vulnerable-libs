import { pathExists, readJSON, writeFile } from 'fs-extra'
import { find } from 'lodash/fp'
import { join } from 'path'
import { assert } from '../utils/logger'
import { CouchDumpFormat, MainFn } from './_all.types'
import { OUT_FILE_NAME as COUCH_DUMP_FILE } from './couch-dump'

const FORMATTED_PREFIX = 'formatted-'

type CouchDumpIn = { name: string; versions: { v: string; time: string }[] }

export const environment = {
  /**
   * Location of CouchDB dump file
   *
   * @example
   *   './data/logs/LOCAL/npm-db-dump/ZENBOOK/2018-07-03T18:29:49.170Z'
   */
  COUCH_DUMP: {},
}

export const main: MainFn<typeof environment> = async function main(
  log,
  { OUT: OUT_COUCH_DUMP_FOLDER, COUCH_DUMP: inCouchDumpDir },
) {
  const inCouchDumpFile = join(inCouchDumpDir, COUCH_DUMP_FILE)
  const outCouchDumpFile = join(OUT_COUCH_DUMP_FOLDER, FORMATTED_PREFIX + COUCH_DUMP_FILE)

  assert(await pathExists(inCouchDumpDir), log, 'COUCH_DUMP folder does not exist')
  assert(await pathExists(inCouchDumpFile), log, 'COUCH_DUMP file in this folder does not exist')

  const file = (await readJSON(inCouchDumpFile)) as CouchDumpIn[]

  const map = new Map<CouchDumpIn['name'], CouchDumpIn['versions']>()
  for (let { name, versions } of file) {
    const existing: CouchDumpIn['versions'] = map.get(name) || []
    for (let ver of versions) {
      const el = find((el) => el.v === ver.v, existing)
      if (!el) {
        existing.push(ver)
      } else {
        if (el.time !== ver.time) {
          log.warn(
            { name, versions: { one: el, two: ver } },
            'two of the same version have different creation time',
          )
        }
      }
    }
    map.set(name, existing)
  }

  const entries: [CouchDumpIn['name'], CouchDumpIn['versions']][] = [...map.entries()]

  const formatted: CouchDumpFormat = {}
  for (let [name, versions] of entries) {
    const vtMap = {} as { [version: string]: string }
    for (let { v, time } of versions) {
      vtMap[v] = time
    }
    formatted[name] = vtMap
  }

  await writeFile(outCouchDumpFile, JSON.stringify(formatted), { encoding: 'utf-8' })
}
