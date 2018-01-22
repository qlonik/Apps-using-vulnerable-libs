import test from 'ava'
import { readJSON } from 'fs-extra'
import { head } from 'lodash'
import { join } from 'path'
import { parseScriptsFromCordovaApp } from './parseApps'
import { analyseLibFiles, extractMainFiles } from './parseLibraries'
import { SimilarityToLibs } from './similarityIndex'
import { saveFiles } from './utils/files'


const LIBS_PATH = '../data/sample_libs.test-copy'
const TEST_SNOWBUDDY_PATH = '../data/sample_apps/random/Snowbuddy-1.2.8.test-copy'

test.serial.skip('Snowbuddy analysis works', async t => {
  await saveFiles(
    analyseLibFiles(
      await saveFiles(extractMainFiles({
        libsPath: LIBS_PATH,
        name: 'jquery',
        version: '2.1.1',
      })),
      { conservative: false }),
    { conservative: false })
  await parseScriptsFromCordovaApp({
    appPath: TEST_SNOWBUDDY_PATH,
    libsPath: LIBS_PATH,
  }, { debugDoLess: true })

  const simsPath = join(TEST_SNOWBUDDY_PATH, 'jsAnalysis', 'head', '0000', 'similarities.json')
  const sims = <SimilarityToLibs>await readJSON(simsPath)

  t.deepEqual([
    'fnNamesOur',
    'fnNamesJaccard',
    'fnStTokens',
    'fnStTypes',
  ].sort(), Object.keys(sims).sort())
  t.deepEqual({
    name: 'jquery',
    version: '2.1.1',
    file: '0001.json',
    similarity: {
      val: 1,
      num: 413,
      den: 413,
    }
  }, head(sims.fnNamesJaccard))
  t.deepEqual({
    name: 'jquery',
    version: '2.1.1',
    file: '0001.json',
    similarity: {
      val: 1,
      num: 561,
      den: 561,
    }
  }, head(sims.fnStTokens))
  t.deepEqual({
    name: 'jquery',
    version: '2.1.1',
    file: '0001.json',
    similarity: {
      val: 1,
      num: 561,
      den: 561,
    }
  }, head(sims.fnStTypes))
})
