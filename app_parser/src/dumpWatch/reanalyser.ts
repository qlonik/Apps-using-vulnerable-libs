import { oneLine } from 'common-tags'
import { getLibNameVersions } from '../parseLibraries'
import { isInBlacklist } from '../pkgBlacklist'
import { onelineUtilInspect, stdoutLog } from '../utils/logger'
import { createAutoClosedPool, WorkerInstance } from '../utils/workerPool'
import { LOG_NAMESPACE, messages, reanalyseLibRequest } from './common'
import { workerPool } from './workerPool'


const LIB_PATH = '../data/sample_libs'

const log = stdoutLog(LOG_NAMESPACE)
const useExecutorsPool = createAutoClosedPool(workerPool)

const reanalyseLibs = ({ libsPath, name, version }: reanalyseLibRequest) => {
  return async (worker: WorkerInstance<messages>) => {

    const { name: nameBack, version: versionBack, analysis } = await worker.send('reanalyse', {
      libsPath,
      name,
      version,
    })

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
  const nameVersions = await getLibNameVersions(LIB_PATH)
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

