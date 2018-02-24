import { test } from 'ava'
import { readFile, readJSON } from 'fs-extra'
import { join } from 'path'
import { extractStructure } from './index'
import { APP_TYPES, appDesc } from '../parseApps'
import { libNameVersion } from '../parseLibraries'
import { SIG_FOLDER as SIGS_PATH } from '../parseLibraries/constants'
import { myWriteJSON } from '../utils/files'

const UPDATE_SIGNATURES = false

export const TEST_LIBS_PATH = 'test/fixtures/libs'
export const SAMPLE_LIB_DESC: libNameVersion = { name: 'sample', version: '1.0.0' }
export const SAMPLE_LIB_PATH = join(TEST_LIBS_PATH, SAMPLE_LIB_DESC.name, SAMPLE_LIB_DESC.version)
export const MAINS_PATH = 'mains'

export const TEST_APPS_PATH = 'test/fixtures/apps'
export const SAMPLE_APP_DESC: appDesc = { type: APP_TYPES.cordova, section: 's0', app: 'sample' }
export const SAMPLE_APP_PATH = join(TEST_APPS_PATH, SAMPLE_APP_DESC.section, SAMPLE_APP_DESC.app)

test("extracted lib structure didn't change", async t => {
  const srcContent = await readFile(join(SAMPLE_LIB_PATH, MAINS_PATH, '0000.js'), 'utf-8')
  const structure = await extractStructure({ content: srcContent })
  let sigContent
  if (UPDATE_SIGNATURES) {
    await myWriteJSON({ content: structure, file: join(SAMPLE_LIB_PATH, SIGS_PATH, '0000.json') })
    sigContent = structure
  } else {
    sigContent = await readJSON(join(SAMPLE_LIB_PATH, SIGS_PATH, '0000.json'))
  }

  t.snapshot(srcContent)
  t.snapshot(sigContent)
  t.snapshot(structure)
  t.deepEqual(sigContent, structure)
})

test("extracted app structure didn't change", async t => {
  const srcContent = await readFile(join(SAMPLE_APP_PATH, 'src.js'), 'utf-8')
  const structure = await extractStructure({ content: srcContent })
  let sigContent
  if (UPDATE_SIGNATURES) {
    await myWriteJSON({ content: structure, file: join(SAMPLE_APP_PATH, 'structure.json') })
    sigContent = structure
  } else {
    sigContent = await readJSON(join(SAMPLE_APP_PATH, 'structure.json'))
  }

  t.snapshot(srcContent)
  t.snapshot(sigContent)
  t.snapshot(structure)
  t.deepEqual(sigContent, structure)
})
