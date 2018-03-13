import { pathExists, readdir, readJSON } from 'fs-extra'
import { flatten } from 'lodash'
import { join } from 'path'
import { worker } from 'workerpool'
import { signatureNew } from '../extractStructure'
import { APP_TYPES, appPath as appPathFn } from '../parseApps'
import { ANALYSIS_FOLDER, CORDOVA_SIG_FILE, REACT_NATIVE_SIG_FILE } from '../parseApps/constants'
import { getCandidateLibs } from '../similarityIndex'
import { resolveAllOrInParallel } from '../utils'
import { CandidateMap, IdReport, LocationIdReport, messages } from './compute-candidates'

worker<messages>({
  createCandidatesForApp: async ({
    app: { type, section, app },
    allAppsPath,
    allLibsPath: libsPath,
  }): Promise<CandidateMap | null> => {
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
  },
})
