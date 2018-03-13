import { readJSON } from 'fs-extra'
import { random } from 'lodash'
import { join } from 'path'
import { appDesc } from '../parseApps'
import { LIB_CANDIDATES_FILE } from '../parseApps/constants'
import { myWriteJSON } from '../utils/files'
import { AppCandidateMap, CandidateMap } from './compute-candidates'

const ALL_APPS_PATH = '../data/sample_apps'
const LIB_CANDIDATES_PATH = join(ALL_APPS_PATH, LIB_CANDIDATES_FILE)
const RANDOM_100_PATH = join(ALL_APPS_PATH, '../random_100.json')
const RANDOM_10_PATH = join(ALL_APPS_PATH, '../random_10.json')

interface AppFilesMap {
  [id: string]: {
    app: appDesc
    files: CandidateMap
  }
}

function transformToMap(ids: string[], origData: AppCandidateMap) {
  return ids.sort().reduce(
    (acc, id) => {
      const { app, candidates } = origData[id]
      return { ...acc, [id]: { app, files: candidates } }
    },
    {} as AppFilesMap,
  )
}

export async function main() {
  const appCandidates = (await readJSON(LIB_CANDIDATES_PATH)) as AppCandidateMap
  const names = Object.keys(appCandidates)
  let res100: string[] = []
  for (let i = 0; i < 100; i++) {
    const rndI = random(names.length)
    res100 = res100.concat(names.splice(rndI, 1))
  }
  const res100copy = res100.slice()
  let res10: string[] = []
  for (let i = 0; i < 10; i++) {
    const rndI = random(res100copy.length)
    res10 = res10.concat(res100copy.splice(rndI, 1))
  }

  const cand100 = transformToMap(res100, appCandidates)
  const cand10 = transformToMap(res10, appCandidates)

  await myWriteJSON({ content: cand100, file: RANDOM_100_PATH })
  await myWriteJSON({ content: cand10, file: RANDOM_10_PATH })
}
