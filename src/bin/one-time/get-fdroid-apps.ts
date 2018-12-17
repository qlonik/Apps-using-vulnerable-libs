/**
 * remove this file
 * @deprecated
 */

import { pathExists, readJSON } from 'fs-extra'
import { intersection, partition } from 'lodash'
import { getApps } from '../../parseApps'
import { fileOp, saveFiles } from '../../utils/files'
import { stdoutLog } from '../../utils/logger'
import { MainFn } from '../_all.types'

const APPS_PATH = '../data/sample_apps'
const FDROID_APPS = '../data/FDroid_AppData.json'
const APP_NAME_PARSING = /^(.*)-(\d+)-(\d{4}_\d{2}_\d{2})\.apk$/

const log = stdoutLog('get-fdroid-apps')
log.enabled = true

interface FDroidApp {
  appId: number
  name: string
  description: null // more?
  categories: string
  license: string
  auto_name: string
  provides: null // more?
  website: string
  source_code: string
  issue_tracker: null // more?
  donate: null // more?
  flattrid: null // more?
  bitcoin: null // more?
  litecoin: null // more?
  summary: null // more?
  maintainer_notes: null // more?
  repo_type: string
  antifeatures: null // more?
  disabled: null // more?
  requires_root: null // more?
  archive_policy: null // more?
  update_check_mode: null // more?
  vercode_operation: null // more?
  update_check_ignore: null // more?
  auto_update_mode: null // more?
  current_version: string
  current_build_number: number
  no_source_since: null // more?
}

let i = 0

export const main: MainFn = async function main() {
  if (!await pathExists(APPS_PATH) || !await pathExists(FDROID_APPS)) {
    throw new Error('no required paths')
  }

  const fDroidApps = (await readJSON(FDROID_APPS)) as FDroidApp[]
  log('FDroid apps length: %o', fDroidApps.length)

  const appNamesParsed = (await getApps(APPS_PATH)).map(({ type, section, app }) => {
    const matched = APP_NAME_PARSING.exec(app)
    if (matched === null) {
      return { matched: false, type, section, app }
    }
    const [, name, buildS, date] = matched
    return { matched: true, type, section, app, name, build: parseInt(buildS), date }
  })
  log('our apps length: %o', appNamesParsed.length)

  const [successfulParsing, failedParsing] = partition(appNamesParsed, 'matched')

  if (failedParsing.length > 0) {
    log('failed parsing names of %o apps', failedParsing.length)
    for (let { type, section, app } of failedParsing) {
      log('failed: { %o, %o, %o }', type, section, app)
    }
  }

  const ourAppsNames = successfulParsing.map(({ name }) => name)
  const fdroidNames = fDroidApps.map(({ name }) => name)

  log('app name intersection size: %o', intersection(ourAppsNames, fdroidNames).length)

  type objMap = { [x: string]: any }
  const result = {
    moreThanOneBuildNumberMatches: {} as objMap,
    oneBuildNumberMatches: {} as objMap,
    zeroBuildNumberMatches: {} as objMap,
  }

  for (let { type, section, app, name, build } of successfulParsing) {
    const nameCandidates = fDroidApps.filter(({ name: fDroidName }) => fDroidName === name)

    if (nameCandidates.length === 0) {
      continue
    }

    if (i < 10) {
      log('parsed name: %o, %o, %o, %o', app, name, build, nameCandidates)
      i++
    }

    const buildCandidates = nameCandidates.filter(
      ({ current_build_number }) => current_build_number === build,
    )

    const appId = `${type}/${section}/${app}`

    if (buildCandidates.length > 1) {
      log('more than one build number candidate: %o, %o', app, buildCandidates)
      result.moreThanOneBuildNumberMatches[appId] = {
        type,
        section,
        app,
        name,
        build,
        buildCandidates,
      }
    } else if (buildCandidates.length === 1) {
      result.oneBuildNumberMatches[appId] = {
        type,
        section,
        app,
        name,
        build,
        buildCandidates,
      }
    } else {
      log('no exact match: %o, %o', app, nameCandidates)
      result.zeroBuildNumberMatches[appId] = {
        type,
        section,
        app,
        name,
        build,
        nameCandidates,
      }
    }
  }

  await saveFiles({
    cwd: '../data',
    dst: 'matched_to_FDroid.json',
    conservative: false,
    type: fileOp.json,
    json: result,
  })
}
