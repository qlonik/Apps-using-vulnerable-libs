import { pathExists, readJSON, writeFile } from 'fs-extra'
import { find } from 'lodash/fp'
import { join } from 'path'
import { assert } from '../utils/logger'
import { MainFn } from './_all.types'

const IN_COUCH_DUMP_FOLDER = ''
const COUCH_DUMP_FILE = 'liblibNamesVersions.json'
const FORMATTED_PREFIX = 'formatted-'
const OUT_COUCH_DUMP_FOLDER = process.env.OUT!

type format = {
  name: string
  versions: { v: string; time: string }[]
}

export const main: MainFn = async function main(log) {
  const inCouchDumpDir = assert(IN_COUCH_DUMP_FOLDER, log, 'Location of COUCH_DUMP is not set')
  const inCouchDumpFile = join(inCouchDumpDir, COUCH_DUMP_FILE)
  const outCouchDumpFile = join(OUT_COUCH_DUMP_FOLDER, FORMATTED_PREFIX + COUCH_DUMP_FILE)

  assert(await pathExists(inCouchDumpDir), log, 'COUCH_DUMP folder does not exist')
  assert(await pathExists(inCouchDumpFile), log, 'COUCH_DUMP file in this folder does not exist')

  const map = new Map<format['name'], format['versions']>()
  let file = (await readJSON(inCouchDumpFile)) as format[]
  for (let { name, versions } of file) {
    const existing: format['versions'] = map.get(name) || []
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

  file = []
  for (let name of [...map.keys()].sort()) {
    file.push({ name, versions: map.get(name)! })
  }

  const formatted = '[\n  ' + file.map((x) => JSON.stringify(x)).join(',\n  ') + '\n]'
  await writeFile(outCouchDumpFile, formatted, { encoding: 'utf-8' })
}
