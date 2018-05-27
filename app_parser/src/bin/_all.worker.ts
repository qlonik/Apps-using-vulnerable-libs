import { relative } from 'path'
import { worker } from 'workerpool'
import { analyseLibFiles, extractMainFiles, updateUnionLiteralSignature } from '../parseLibraries'
import { saveFiles } from '../utils/files'
import logger from '../utils/logger'
import { allMessages as messages } from './_all.types'

const logFileName = relative(process.cwd(), __filename)
const makeLog = (fn: string) => logger.child({ name: `${logFileName} >> ${fn}` })

const rllog = makeLog('reanalyse-lib')

worker<messages>({
  'reanalyse-lib': async ({ libsPath, lib }) => {
    rllog.trace({ lib }, 'reanalysing lib')

    const main = await saveFiles(extractMainFiles({ libsPath, ...lib }, { conservative: true }))
    if (main.length === 0) {
      rllog.warn({ lib }, 'no main files')
      return
    }
    const analysis = await saveFiles(analyseLibFiles(main, { conservative: false }))
    if (analysis.length === 0) {
      rllog.warn({ lib }, 'no analysis files')
      return
    }
    await updateUnionLiteralSignature({ libsPath, ...lib })

    rllog.trace({ lib, main, analysis }, 'finished lib')
  },
})

process.on('SIGINT', () => {})
