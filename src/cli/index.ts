import { stat, constants, access } from 'fs-extra'
import { join } from 'path'
import globCb from 'glob'
import * as yargs from 'yargs' // eslint-disable-line import/no-namespace
import { Logger } from 'pino'
import { promisify } from 'util'
import { EnvironmentError } from '../utils/errors'
import { log as logger, assert } from '../utils/logger'
import { EnvironmentSpecifier, EnvironmentValues, MainFn } from '../bin/_all.types'
import { transformAndCleanScriptNames } from './_strip-illegal-names'

const SCRIPTS_LOCATION = '../bin'

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

const verifyBinEnvironment = <E extends EnvironmentSpecifier>(
  log: Logger,
  orig: EnvironmentValues<E>,
  e: E,
): EnvironmentValues<E> => {
  return [...Object.entries(e)].reduce((acc, [key]) => {
    const value = assert(process.env[key], log, `$${key} is not set`, 'fatal')
    return Object.assign(acc, { [key]: value })
  }, orig)
}

const glob = promisify(globCb)

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

      const allowedDirs = ['one-time']
      const [script] = transformAndCleanScriptNames([args.script], allowedDirs)
      if (!script) {
        logger.error({ script: args.script, err: new Error('illegal bin script') })
        throw null
      }

      const scriptPath = require.resolve(`${SCRIPTS_LOCATION}/${script}`)
      try {
        await access(scriptPath, constants.F_OK)
      } catch (err) {
        logger.error({ 'original-script-name': args.script, script, err }, 'file is not present')
        throw null
      }
      try {
        await access(scriptPath, constants.R_OK)
      } catch (err) {
        logger.error({ 'original-script-name': args.script, script, err }, 'file is not readable')
        throw null
      }

      const log = logger.child({ name: script })
      const module = await import(scriptPath)
      const main: MainFn = module.main
      if (typeof main !== 'function') {
        log.error({ err: new TypeError('no main exported') })
        throw null
      }
      if (typeof module.terminate === 'function') {
        process.on('SIGINT', module.terminate(log))
      }

      const envSpec: EnvironmentSpecifier = module.environment
      let env: EnvironmentValues<EnvironmentSpecifier> = {
        OUT: process.env.OUT!,
      }
      if (envSpec) {
        try {
          env = verifyBinEnvironment(log, env, envSpec)
        } catch {
          throw null
        }
      }

      log.info({ env }, 'master process')
      const start = process.hrtime()
      try {
        await main(log, env)
        const time = process.hrtime(start)
        log.info({ 'run-time': time }, 'total time')
      } catch (err) {
        const time = process.hrtime(start)
        log.error({ 'run-time': time, err }, 'global error from main()')
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
      const scripts = await glob(`**/*.js`, { cwd: join(__dirname, SCRIPTS_LOCATION) })
      const names = transformAndCleanScriptNames(scripts)

      logger.info({ names }, 'available commands')
    },
  )
  .help()
  .showHelpOnFail(false, 'Specify -h for available commands')
  .alias('help', 'h')
  .alias('version', 'v')
  .parse()
