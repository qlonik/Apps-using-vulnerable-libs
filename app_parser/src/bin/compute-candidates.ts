import { pathExists, readdir, readJSON } from 'fs-extra'
import { once, flatten } from 'lodash'
import { join } from 'path'
import { signatureNew } from '../extractStructure'
import { APP_TYPES, appDesc, appPath as appPathFn } from '../parseApps'
import {
  ANALYSIS_FOLDER,
  CORDOVA_SIG_FILE,
  FINISHED_ANALYSIS_FILE,
  FINISHED_PREPROCESSING_FILE,
  LIB_CANDIDATES_FILE,
  REACT_NATIVE_SIG_FILE,
} from '../parseApps/constants'
import { getCandidateLibs } from '../similarityIndex'
import { resolveAllOrInParallel } from '../utils'
import { myWriteJSON } from '../utils/files'
import { stdoutLog } from '../utils/logger'

const ALL_APPS_PATH = '../data/sample_apps'
const FIN_PRE_APPS_PATH = join(ALL_APPS_PATH, FINISHED_PREPROCESSING_FILE)
const FIN_AN_APPS_PATH = join(ALL_APPS_PATH, FINISHED_ANALYSIS_FILE)
const LIB_CANDIDATES_PATH = join(ALL_APPS_PATH, LIB_CANDIDATES_FILE)
const ALL_LIBS_PATH = '../data/sample_libs'

const log = stdoutLog('compute-candidates')
log.enabled = true
let terminating = false

interface IdNoSignature {
  id: string
  signatureExists: false
}
interface IdCandidate {
  id: string
  signatureExists: true
  candidates: string[]
}
type IdReport = IdNoSignature | IdCandidate
interface LocationIdNoSignature extends IdNoSignature {
  location: string
}
interface LocationIdCandidate extends IdCandidate {
  location: string
}
type LocationIdReport = LocationIdNoSignature | LocationIdCandidate

interface CandidateMap {
  [id: string]: IdReport | LocationIdReport
}
interface AppCandidate {
  app: appDesc
  candidates: CandidateMap
}
interface AppCandidateMap {
  [id: string]: AppCandidate
}

const createCandidatesForApp = async ([
  { app: { type, section, app }, allAppsPath, allLibsPath: libsPath },
]: [{ app: appDesc; allAppsPath: string; allLibsPath: string }]): Promise<CandidateMap | null> => {
  if (type === APP_TYPES.cordova) {
    /**
     * get location/id/signatures
     * taken from {@link analyseCordovaApp}
     * todo: should refactor into its own function
     */
    const appPath = appPathFn(allAppsPath, type, section, app)
    const analysisPath = join(appPath, ANALYSIS_FOLDER)
    if (!await pathExists(analysisPath)) {
      return null
    }
    const locations = await readdir(analysisPath)
    const locationId = flatten(
      await resolveAllOrInParallel(
        locations.map((location) => async () => {
          return (await readdir(join(analysisPath, location))).map((id) => ({ location, id }))
        }),
      ),
    )
    const locIdCandidate = await resolveAllOrInParallel(
      locationId.map(({ location, id }) => async (): Promise<LocationIdReport> => {
        const sigFile = join(analysisPath, location, id, CORDOVA_SIG_FILE)
        if (!await pathExists(sigFile)) {
          return { location, id, signatureExists: false }
        }

        const signature = (await readJSON(sigFile)) as signatureNew
        const candidates = await getCandidateLibs({ signature, libsPath })
        return { location, id, signatureExists: true, candidates }
      }),
    )

    return locIdCandidate
      .sort((a, b) => `${a.location}/${a.id}`.localeCompare(`${b.location}/${b.id}`))
      .reduce(
        (acc, report) => ({ ...acc, [`${report.location}/${report.id}`]: report }),
        {} as CandidateMap,
      )
  }
  if (type === APP_TYPES.reactNative) {
    /**
     * get id/signatures
     * todo: should refactor into its own function
     */
    const appPath = appPathFn(allAppsPath, type, section, app)
    const analysisPath = join(appPath, ANALYSIS_FOLDER)
    if (!await pathExists(analysisPath)) {
      return null
    }
    const ids = await readdir(analysisPath)
    const idCandidate = await resolveAllOrInParallel(
      ids.map((id) => async (): Promise<IdReport> => {
        const sigFile = join(analysisPath, id, REACT_NATIVE_SIG_FILE)
        if (!await pathExists(sigFile)) {
          return { id, signatureExists: false }
        }
        const signature = (await readJSON(sigFile)) as signatureNew
        const candidates = await getCandidateLibs({ signature, libsPath })
        // remark: ^^ treats one file as one library
        // this is not always correct, as in react-native
        // multiple files might belong to one library
        return { id, signatureExists: true, candidates }
      }),
    )

    return idCandidate
      .sort((a, b) => a.id.localeCompare(b.id))
      .reduce((acc, report) => ({ ...acc, [report.id]: report }), {} as CandidateMap)
  }
  return null
}

async function main() {
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

  log('started computation')
  type CompletedAppCandidate = { done: true } & AppCandidate
  const candidatesForApps = await resolveAllOrInParallel(
    analysedApps.map((app) => async (): Promise<{ done: false } | CompletedAppCandidate> => {
      if (terminating) {
        return { done: false }
      }
      const candidates = await createCandidatesForApp([
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
}

if (!module.parent) {
  process.on(
    'SIGINT',
    once(() => {
      log('started terminating')
      terminating = true
    }),
  )

  main().catch((err) => log('Some global error:\n%s', err.stack))
}
