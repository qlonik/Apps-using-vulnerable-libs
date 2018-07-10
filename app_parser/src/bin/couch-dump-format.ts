import { pathExists, readJSON, writeFile } from 'fs-extra'
import { find } from 'lodash/fp'
import { join } from 'path'
import { assert } from '../utils/logger'
import { CouchDumpFormat, MainFn } from './_all.types'

const IN_COUCH_DUMP_FOLDER = ''
const COUCH_DUMP_FILE = 'liblibNamesVersions.json'
const FORMATTED_PREFIX = 'formatted-'
const OUT_COUCH_DUMP_FOLDER = process.env.OUT!

type CouchDumpIn = { name: string; versions: { v: string; time: string }[] }

export const main: MainFn = async function main(log) {
  const inCouchDumpDir = assert(IN_COUCH_DUMP_FOLDER, log, 'Location of COUCH_DUMP is not set')
  const inCouchDumpFile = join(inCouchDumpDir, COUCH_DUMP_FILE)
  const outCouchDumpFile = join(OUT_COUCH_DUMP_FOLDER, FORMATTED_PREFIX + COUCH_DUMP_FILE)

  assert(await pathExists(inCouchDumpDir), log, 'COUCH_DUMP folder does not exist')
  assert(await pathExists(inCouchDumpFile), log, 'COUCH_DUMP file in this folder does not exist')

  const map = new Map<CouchDumpIn['name'], CouchDumpIn['versions']>()
  const file = (await readJSON(inCouchDumpFile)) as CouchDumpIn[]
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

  const formatted: CouchDumpFormat = ([...map.entries()] as [
    CouchDumpIn['name'],
    CouchDumpIn['versions']
  ][]).reduce(
    (acc, [name, versions]) => ({
      ...acc,
      [name]: versions.reduce((acc, { v, time }) => ({ ...acc, [v]: time }), {}),
    }),
    {},
  )

  await writeFile(outCouchDumpFile, JSON.stringify(formatted), { encoding: 'utf-8' })
}
