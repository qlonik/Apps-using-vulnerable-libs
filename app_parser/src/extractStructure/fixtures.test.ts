import test from 'ava'
import { readFile, readJSON } from 'fs-extra'
import { join } from "path"
import { AppDescription } from '../parseApps'
import { libDesc } from '../parseLibraries'
import { extractStructure } from './index'


export const TEST_LIBS_PATH = 'test/fixtures/libs'
export const SAMPLE_LIB_DESC: libDesc = { name: 'sample', version: '1.0.0' }
export const SAMPLE_LIB_PATH = join(TEST_LIBS_PATH, SAMPLE_LIB_DESC.name, SAMPLE_LIB_DESC.version)
export const MAINS_PATH = 'mains'
export const SIGS_PATH = 'sigs'

export const TEST_APPS_PATH = 'test/fixtures/apps'
export const SAMPLE_APP_DESC: AppDescription = { section: 's0', app: 'sample' }
export const SAMPLE_APP_PATH = join(TEST_APPS_PATH, SAMPLE_APP_DESC.section, SAMPLE_APP_DESC.app)

test('extracted lib structure didn\'t change', async t => {
  const srcContent = await readFile(join(SAMPLE_LIB_PATH, MAINS_PATH, '0000.js'), 'utf-8')
  const sigContent = await readJSON(join(SAMPLE_LIB_PATH, SIGS_PATH, '0000.json'))
  const structure = await extractStructure({ content: srcContent })

  t.snapshot(srcContent)
  t.snapshot(sigContent)
  t.snapshot(structure)
  t.deepEqual(sigContent, structure)
})

test('extracted app structure didn\'t change', async t => {
  const srcContent = await readFile(join(SAMPLE_APP_PATH, 'src.js'), 'utf-8')
  const sigContent = await readJSON(join(SAMPLE_APP_PATH, 'structure.json'))
  const structure = await extractStructure({ content: srcContent })

  t.snapshot(srcContent)
  t.snapshot(sigContent)
  t.snapshot(structure)
  t.deepEqual(sigContent, structure)
})
