import { pathExists, readJSON } from 'fs-extra'
import { once } from 'lodash'
import { join } from 'path'
import { The } from 'typical-mini'
import { MessagesMap, pool as poolFactory } from 'workerpool'
import { appDesc } from '../parseApps'
import {
  FINISHED_ANALYSIS_FILE,
  FINISHED_PREPROCESSING_FILE,
  LIB_PREPROCESSED_CANDIDATES_FILE,
} from '../parseApps/constants'
import { indexValue } from '../similarityIndex/set'
import { resolveAllOrInParallel } from '../utils'
import { myWriteJSON } from '../utils/files'
import { stdoutLog } from '../utils/logger'
import { getWorkerPath } from '../utils/worker'

export type messages = The<
  MessagesMap,
  {
    createCandidatesForApp: [
      [{ app: appDesc; allAppsPath: string; allLibsPath: string }],
      CandidateMap | null
    ]
  }
>

const ALL_APPS_PATH = '../data/sample_apps'
const FIN_PRE_APPS_PATH = join(ALL_APPS_PATH, FINISHED_PREPROCESSING_FILE)
const FIN_AN_APPS_PATH = join(ALL_APPS_PATH, FINISHED_ANALYSIS_FILE)
const LIB_CANDIDATES_PATH = join(ALL_APPS_PATH, LIB_PREPROCESSED_CANDIDATES_FILE)
const ALL_LIBS_PATH = '../data/sample_libs'

const log = stdoutLog('compute-candidates')
log.enabled = true
let terminating = false

export interface IdNoSignature {
  id: string
  signatureExists: false
}
export interface IdCandidate {
  id: string
  signatureExists: true
  candidates: { name: string; index: indexValue }[]
}
export type IdReport = IdNoSignature | IdCandidate
export interface LocationIdNoSignature extends IdNoSignature {
  location: string
}
export interface LocationIdCandidate extends IdCandidate {
  location: string
}
export type LocationIdReport = LocationIdNoSignature | LocationIdCandidate

export interface CandidateMap {
  [id: string]: IdReport | LocationIdReport
}
export interface AppCandidate {
  app: appDesc
  candidates: CandidateMap
}
export interface AppCandidateMap {
  [id: string]: AppCandidate
}

const main = async () => {
  const wPath = await getWorkerPath(__filename)
  const preprocessedApps: appDesc[] = (await pathExists(FIN_PRE_APPS_PATH))
    ? await readJSON(FIN_PRE_APPS_PATH)
    : []
  const analysedApps: appDesc[] = (await pathExists(FIN_AN_APPS_PATH))
    ? await readJSON(FIN_AN_APPS_PATH)
    : []

  {
    let l
    if ((l = preprocessedApps.length - analysedApps.length) > 0) {
      log('apps: (prep=%o)-(an=%o)=(todo=%o)', preprocessedApps.length, analysedApps.length, l)
    }
  }

  if (terminating) {
    return
  }

  const pool = poolFactory(wPath, { minWorkers: 0 })
  log('pool: min=%o, max=%o, %o', pool.minWorkers, pool.maxWorkers, pool.stats())

  log('started computation')
  type CompletedAppCandidate = { done: true } & AppCandidate
  const candidatesForApps = await resolveAllOrInParallel(
    preprocessedApps.map((app) => async (): Promise<{ done: false } | CompletedAppCandidate> => {
      if (terminating) {
        return { done: false }
      }
      const candidates = await pool.exec('createCandidatesForApp', [
        { app, allAppsPath: ALL_APPS_PATH, allLibsPath: ALL_LIBS_PATH },
      ])

      if (candidates === null) {
        return { done: false }
      } else {
        return { done: true, app, candidates }
      }
    }),
  )
  if (terminating) {
    log('terminated computation')
  } else {
    log('finished computation')
  }

  const appCandidatesMap = candidatesForApps
    .filter<CompletedAppCandidate>((v): v is CompletedAppCandidate => v.done)
    .sort(({ app: a }, { app: b }) => {
      return `${a.type}/${a.section}/${a.app}`.localeCompare(`${b.type}/${b.section}/${b.app}`)
    })
    .reduce(
      (acc, { app, candidates }) => {
        const id = `${app.type}/${app.section}/${app.app}`
        acc[id] = { app, candidates }
        return acc
      },
      {} as AppCandidateMap,
    )

  log('apps: (done=%o) (total=%o)', Object.keys(appCandidatesMap).length, candidatesForApps.length)

  await myWriteJSON({ content: appCandidatesMap, file: LIB_CANDIDATES_PATH })
  log('wrote candidates file')

  await pool.terminate()
}

const terminate = once(() => {
  log('started terminating')
  terminating = true
})

if (!module.parent) {
  process.on('SIGINT', terminate)
  main().catch((err) => log('Some global error:\n%s', err.stack))
}
