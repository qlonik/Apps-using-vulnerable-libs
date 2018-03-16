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

type appDescMap = { [id: string]: appDesc }
const chooseRandom = (
  arr: appDesc[],
  n: number,
): { picked: appDesc[]; ids: string[]; map: appDescMap } => {
  const arrCopy = arr.slice()
  let picked: appDesc[] = []

  for (let i = 0; i < n; i++) {
    const rndI = random(arrCopy.length)
    const selectedEl = arrCopy.splice(rndI, 1)
    picked = picked.concat(selectedEl)
  }

  picked.sort((a, b) => {
    return `${a.type}/${a.section}/${a.app}`.localeCompare(`${b.type}/${b.section}/${b.app}`)
  })

  const map = picked.reduce(
    (acc, app) => {
      const id = `${app.type}/${app.section}/${app.app}`
      return { ...acc, [id]: app }
    },
    {} as appDescMap,
  )

  return { ids: Object.keys(map), map, picked }
}

export async function main() {
  const appCandidates = (await readJSON(FIN_PREP_PATH)) as appDesc[]
  const res100 = chooseRandom(appCandidates, 100)
  const res10 = chooseRandom(res100.picked, 10)

  await myWriteJSON({ content: res100, file: RANDOM_100_PATH })
  await myWriteJSON({ content: res10, file: RANDOM_10_PATH })
}
