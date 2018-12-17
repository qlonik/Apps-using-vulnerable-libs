import { readJSON } from 'fs-extra'
import { join } from 'path'
import { random } from 'lodash/fp'
import { appDesc } from '../../parseApps'
import { FINISHED_ANALYSIS_FILE } from '../../parseApps/constants'
import { MainFn } from '../_all.types'

const RND_NUM = 10

export const environment = {
  APPS_PATH: {},
}

export const main: MainFn<typeof environment> = async function main(log, { APPS_PATH }) {
  const FIN_APPS_PATH = join(APPS_PATH, FINISHED_ANALYSIS_FILE)
  const fin = (await readJSON(FIN_APPS_PATH)) as appDesc[]

  let picked: appDesc[] = []
  for (let i = 0; i < RND_NUM; i++) {
    picked = picked.concat(fin.splice(random(0, fin.length - 1), 1))
  }

  log.info(picked)
}
