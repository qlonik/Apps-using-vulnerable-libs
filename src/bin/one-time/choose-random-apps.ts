import { readJSON } from 'fs-extra'
import { random } from 'lodash'
import { join } from 'path'
import { appDesc } from '../../parseApps'
import { FINISHED_PREPROCESSING_FILE } from '../../parseApps/constants'
import { myWriteJSON } from '../../utils/files'
import { MainFn } from '../_all.types'

export type appDescMap = { [id: string]: appDesc }
export type pickedApps = { picked: appDesc[]; ids: string[]; map: appDescMap }

const RANDOM_100_FILENAME = 'random_100.json'
const RANDOM_10_FILENAME = 'random_10.json'

const chooseRandom = (arr: appDesc[], n: number): pickedApps => {
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

export const environment = {
  APPS_PATH: {},
}

export const main: MainFn<typeof environment> = async function main(
  _,
  { OUT, APPS_PATH: ALL_APPS_PATH },
) {
  const FIN_PREP_PATH = join(ALL_APPS_PATH, FINISHED_PREPROCESSING_FILE)
  const RANDOM_100_PATH = join(OUT, RANDOM_100_FILENAME)
  const RANDOM_10_PATH = join(OUT, RANDOM_10_FILENAME)

  const appCandidates = (await readJSON(FIN_PREP_PATH)) as appDesc[]
  const res100 = chooseRandom(appCandidates, 100)
  const res10 = chooseRandom(res100.picked, 10)

  await myWriteJSON({ content: res100, file: RANDOM_100_PATH })
  await myWriteJSON({ content: res10, file: RANDOM_10_PATH })
}
