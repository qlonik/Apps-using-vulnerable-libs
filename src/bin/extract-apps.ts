import { oneLineTrim } from 'common-tags'
import { pathExists, readdir, remove } from 'fs-extra'
import { differenceWith, flatten, once, partition } from 'lodash/fp'
import { join } from 'path'
import { APP_TYPES, getApps } from '../parseApps'
import { APK_FILE } from '../parseApps/constants'
import { resolveAllOrInParallel } from '../utils'
import { assert } from '../utils/logger'
import { poolFactory } from '../utils/worker'
import { allMessages, MainFn, TerminateFn, WORKER_FILENAME } from './_all.types'

// can be '/gi-pool/appdata-ro' or '/home/nvolodin/20180315/crawl-fdroid/crawl-fdroid/apks'
const INPUT_FOLDER = ''
const TMP_FOLDER = './data/tmp'
const APPS_PATH = './data/sample_apps'
const APPS_APKS = './data/apps_apks'

let terminating = false

const filterPrivate = (strings: string[]): string[] => strings.filter((s) => !s.startsWith('_'))

export const main: MainFn = async function main(log) {
  assert(INPUT_FOLDER, log, 'INPUT_FOLDER is not set', 'fatal')
  const pool = poolFactory<allMessages>(join(__dirname, WORKER_FILENAME), { minWorkers: 1 })

  const loadedSections = filterPrivate(await readdir(INPUT_FOLDER))
  const existingApps = flatten(
    await Promise.all(
      loadedSections.map(async (section) =>
        filterPrivate(await readdir(join(INPUT_FOLDER, section))).map((app) => ({ section, app })),
      ),
    ),
  )
  const finishedApps = await getApps(APPS_PATH)

  const appsToDo = differenceWith(
    (a, b) => `${a.section}/${a.app}` === `${b.section}/${b.app}`,
    existingApps,
    finishedApps,
  )

  log.info(
    {
      allExistingApps: existingApps.length,
      finishedApps: finishedApps.length,
      todo: appsToDo.length,
    },
    'app lengths',
  )

  const parallelOpts = {
    chunkLimit: pool.maxWorkers + 1,
    chunkSize: Math.floor(1.5 * pool.maxWorkers),
  }

  await resolveAllOrInParallel(
    finishedApps.map(({ type, section, app }) => async () => {
      if (terminating) {
        return { done: false, type, section, app }
      }
      if (await pathExists(join(APPS_APKS, type, section, app, APK_FILE))) {
        return { done: true, type, section, app }
      }
      return {
        done: await pool.exec('copy-apk', [
          { inputPath: INPUT_FOLDER, outputPath: APPS_APKS, type, section, app },
        ]),
        type,
        section,
        app,
      }
    }),
    parallelOpts,
  )

  type sectionApp = { section: string; app: string }
  type successfulExtractedReport = sectionApp & { done: true; type: APP_TYPES | 'removed' }
  type failedExtractedReport = sectionApp & { done: false }
  type extractedReport = successfulExtractedReport | failedExtractedReport

  const results = await resolveAllOrInParallel(
    appsToDo.map(({ section, app }) => async (): Promise<extractedReport> => {
      if (terminating) {
        return { done: false, section, app }
      }

      try {
        await pool.exec('extract-app', [
          { inputPath: INPUT_FOLDER, outputPath: TMP_FOLDER, section, app },
        ])
        const type = await pool.exec('move-decomp-app', [
          { inputPath: TMP_FOLDER, outputPath: APPS_PATH, section, app },
        ])
        if (type !== 'removed') {
          await pool.exec('copy-apk', [
            { inputPath: INPUT_FOLDER, outputPath: APPS_APKS, type, section, app },
          ])
        }
        return { done: true, type, section, app }
      } catch (err) {
        log.error({ err, section, app }, 'error from child')
        return { done: false, section, app }
      }
    }),
    parallelOpts,
  )

  const [s, f] = partition(({ done }) => done, results) as [
    successfulExtractedReport[],
    failedExtractedReport[]
  ]
  const cordovaApps = s.filter(({ type }) => type === APP_TYPES.cordova)
  const reactNativeApps = s.filter(({ type }) => type === APP_TYPES.reactNative)
  const removedApps = s.filter(({ type }) => type === 'removed')

  const cl = cordovaApps.length
  const rnl = reactNativeApps.length
  const rl = removedApps.length

  log.info(
    oneLineTrim`
      fin apps: (
        (
          (cr=${cl}) + (rn=${rnl}) = (saved=${cl + rnl})
        ) + (removed=${rl}) = (s=${cl + rnl + rl}==${s.length})
      ) + (f=${f.length}) = (total=${results.length})`,
  )

  await Promise.all(
    loadedSections.map(async (section) => {
      const tmp = join(TMP_FOLDER, section)
      if ((await pathExists(tmp)) && (await readdir(tmp)).length === 0) {
        await remove(tmp)
      }
    }),
  )

  if ((await pathExists(TMP_FOLDER)) && (await readdir(TMP_FOLDER)).length === 0) {
    await remove(TMP_FOLDER)
  }

  await pool.terminate()
}

export const terminate: TerminateFn = (log) =>
  once(() => {
    log.info('started terminating')
    terminating = true
  })
