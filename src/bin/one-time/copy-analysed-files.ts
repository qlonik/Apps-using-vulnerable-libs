import { copy, pathExists, remove } from 'fs-extra'
import { once } from 'lodash'
import { join } from 'path'
import { appPath, getApps } from '../../parseApps'
import { ANALYSIS_FOLDER } from '../../parseApps/constants'
import { resolveAllOrInParallel } from '../../utils'
import { MainFn, TerminateFn } from '../_all.types'

export const environment = {
  INIT_PATH: {},
}

export const main: MainFn<typeof environment> = async (_, { INIT_PATH }) => {
  const DEST_PATH = join(INIT_PATH, '../sample_apps.old_candidates_method')
  const apps = await getApps(INIT_PATH)
  const fileCopyPromises = apps.map(({ type, section, app }) => async (): Promise<void> => {
    const srcAnalysisPath = join(appPath(INIT_PATH, type, section, app), ANALYSIS_FOLDER)
    const destAnalysisPath = join(appPath(DEST_PATH, type, section, app), ANALYSIS_FOLDER)

    if (!(await pathExists(srcAnalysisPath))) {
      return
    }

    if (await pathExists(destAnalysisPath)) {
      await remove(destAnalysisPath)
    }

    await copy(srcAnalysisPath, destAnalysisPath)
  })
  await resolveAllOrInParallel(fileCopyPromises)
}

export const terminate: TerminateFn = () => once(() => {})
