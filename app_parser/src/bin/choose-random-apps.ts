import { readJSON } from 'fs-extra'
import { random } from 'lodash'
import { join } from 'path'
import { appDesc } from '../parseApps'
import { FINISHED_PREPROCESSING_FILE } from '../parseApps/constants'
import { myWriteJSON } from '../utils/files'

const ALL_APPS_PATH = '../data/sample_apps'
const FIN_PREP_PATH = join(ALL_APPS_PATH, FINISHED_PREPROCESSING_FILE)
const RANDOM_100_PATH = join(ALL_APPS_PATH, '../random_100.json')
const RANDOM_10_PATH = join(ALL_APPS_PATH, '../random_10.json')

export async function main() {
  const appCandidates = (await readJSON(FIN_PREP_PATH)) as appDesc[]
  let res100: appDesc[] = []
  for (let i = 0; i < 100; i++) {
    const rndI = random(appCandidates.length)
    res100 = res100.concat(appCandidates.splice(rndI, 1))
  }
  const res100copy = res100.slice()
  let res10: appDesc[] = []
  for (let i = 0; i < 10; i++) {
    const rndI = random(res100copy.length)
    res10 = res10.concat(res100copy.splice(rndI, 1))
  }

  await myWriteJSON({ content: res100, file: RANDOM_100_PATH })
  await myWriteJSON({ content: res10, file: RANDOM_10_PATH })
}
