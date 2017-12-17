import { oneLine } from 'common-tags'
import { getNamesVersions } from '../parseLibraries'
import { isInBlacklist } from '../pkgBlacklist'
import { onelineUtilInspect, stdoutLog } from '../utils/logger'
import {
  clientMessage,
  clientMessageType,
  LOG_NAMESPACE,
  messageFrom,
  reanalysisResult,
  serverMessage,
  serverMessageType
} from './common'
import { ChildProcessWithLog, createAutoClosedPool, workerPool } from './workerPool'


const LIB_PATH = '../data/sample_libs'

const log = stdoutLog(LOG_NAMESPACE)
const useExecutorsPool = createAutoClosedPool(workerPool)

const reanalyseLibs = (
  { libsPath, name, version }: {
    libsPath: string,
    name: string,
    version: string,
  }) => {

  return async (worker: ChildProcessWithLog) => {

    log('(w:%o) got %o', worker.pid, `${name}@${version}`)

    worker.send(<serverMessage>{
      from: messageFrom.server,
      type: serverMessageType.reanalyseLib,
      libsPath,
      name,
      version,
    })

    const { name: nameBack, version: versionBack, analysis } =
      await new Promise<reanalysisResult>(((resolve, reject) => {
        worker.once('message', (msg: clientMessage) => {
          if (msg.type === clientMessageType.reanalysisResult) {
            resolve({ name: msg.name, version: msg.version, analysis: msg.analysis })
          }
          else {
            reject(new Error('wrong message type received'))
          }
        })
      }))

    if (!analysis) {
      log(oneLine`
        (w:%o)
        No analysis files produced for lib %o
      `, worker.pid, `${name}@${version}`)
    }
    else {
      const nvSame = nameBack === name && versionBack === version
      const args = (<any[]>[])
        .concat(worker.pid, `${name}@${version}`)
        .concat(nvSame ? [] : `${nameBack}@${versionBack}`)
        .concat(onelineUtilInspect({ analysis }))

      log(oneLine`
        (w:%o) fin %o
        ${nvSame ? '' : '(recv %o)'}
        ${analysis.length ? '' : '(no analysis files produced)'}
        %s
      `, ...args)
    }

    return analysis
  }
}

async function main() {
  log('started')
  const nameVersions = await getNamesVersions(LIB_PATH)
  const analysisPromises = nameVersions.map(({ name, version }) => {
    if (isInBlacklist({ name, version })) {
      log('got blacklisted %o, skipping...', `${name}@${version}`)
      return Promise.resolve(null)
    }

    return useExecutorsPool(reanalyseLibs({ libsPath: LIB_PATH, name, version }))
  })
  const analysis = await Promise.all(analysisPromises)

  await workerPool.drain()
  await workerPool.clear()
  log('worker pool closed')

  return analysis
}


main()
  .then(() => log('Everything is done!'))
  .catch((err) => log(`Some global error:\n${err}\n${err.stack}`))

