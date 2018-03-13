import { copy, pathExists, remove } from 'fs-extra'
import { once } from 'lodash'
import { join } from 'path'
import { appPath, getApps } from '../parseApps'
import { ANALYSIS_FOLDER } from '../parseApps/constants'
import { resolveAllOrInParallel } from '../utils'

const INIT_PATH = '../data/sample_apps'
const DEST_PATH = '../data/sample_apps.old_candidates_method'

export const main = async () => {
  const apps = await getApps(INIT_PATH)
  const fileCopyPromises = apps.map(({ type, section, app }) => async (): Promise<void> => {
    const srcAnalysisPath = join(appPath(INIT_PATH, type, section, app), ANALYSIS_FOLDER)
    const destAnalysisPath = join(appPath(DEST_PATH, type, section, app), ANALYSIS_FOLDER)

    if (!await pathExists(srcAnalysisPath)) {
      return
    }

    if (await pathExists(destAnalysisPath)) {
      await remove(destAnalysisPath)
    }

    await copy(srcAnalysisPath, destAnalysisPath)
  })
  await resolveAllOrInParallel(fileCopyPromises)
}

export const terminate = once(() => {})
