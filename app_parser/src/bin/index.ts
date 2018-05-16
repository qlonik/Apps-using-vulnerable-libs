import { readdir, stat } from 'fs-extra'
import { kebabCase } from 'lodash'
import * as yargs from 'yargs'
import { EnvironmentError } from '../utils/errors'
import logger from '../utils/logger'
import { stripIllegalNames } from './_strip-illegal-names'

/**
 * Check that environment is properly setup, required environment variables are present:
 *    OUT - location for log output. Needs to be a path
 *    FD - fd to write into for logger. Needs to be a number
 */
const checkEnvironment = async () => {
  const { OUT, FD } = process.env

  if (!OUT) {
    throw new EnvironmentError('$OUT is not set')
  }
  if (!(await stat(OUT)).isDirectory()) {
    throw new EnvironmentError('$OUT is not a directory')
  }

  if (!FD) {
    throw new EnvironmentError('$FD is not set')
  }
  if (Number.isNaN(parseInt(FD, 10))) {
    throw new EnvironmentError('$FD is not a number')
  }
}

yargs
  .command(
    '$0 <script>',
    'execute bin script',
    (yargs) => {
      return yargs.positional('script', {
        desc: 'filename of the script',
        type: 'string',
      })
    },
    async (args) => {
      try {
        await checkEnvironment()
      } catch (err) {
        logger.error({ err }, 'environment check did not pass')
        throw null
      }

      const [script] = stripIllegalNames([args.script])
      if (!script) {
        logger.error({ script: args.script, err: new Error('illegal bin script') })
        throw null
      }
      const kebabedScriptName = script
        .split('/')
        .map(kebabCase)
        .join('/')
      const scriptName = `./${kebabedScriptName}`

      const module = await import(scriptName)
      if (typeof module.main !== 'function') {
        logger.error({ script: kebabedScriptName, err: new TypeError('no main exported') })
        throw null
      }
      if (typeof module.terminate === 'function') {
        process.on('SIGINT', module.terminate)
      }

      logger.info({ script: kebabedScriptName }, 'master process')
      try {
        await module.main()
      } catch (err) {
        logger.error({ script: kebabedScriptName, err }, 'global error from main()')
        throw null
      }
    },
  )
  .command(
    'list',
    'list bin scripts',
    (yargs) => {
      return yargs
    },
    async () => {
      const scripts = await readdir(__dirname)
      const names = stripIllegalNames(scripts)

      logger.info({ names }, 'available commands')
    },
  )
  .help()
  .showHelpOnFail(false, 'Specify -h for available commands')
  .alias('help', 'h')
  .alias('version', 'v')
  .parse()
