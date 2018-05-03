import childProcess from 'child_process'
import debug from 'debug'
import { mkdirp } from 'fs-extra'
import pino from 'pino'
import stream from 'stream'
import { inspect } from 'util'

/*
 * Config for Pino
 */
const PINO_OPTIONS: pino.LoggerOptions = {}
const PINO_PRETTY_OPTIONS: pino.PrettyOptions = {
  forceColor: true,
}

/*
 * Legacy Debug Logger setup
 */
debug.formatters.i = (v: any): string => {
  return (
    '   ' +
    inspect(v, { depth: Infinity, colors: true })
      .split('\n')
      .map((s) => s.trim())
      .join(' ')
  )
}
debug.formatters.I = (v: any): string => {
  return inspect(v, { depth: Infinity, colors: true, breakLength: 50 })
    .split('\n')
    .map((l) => '   ' + l)
    .join('\n')
}
export const stdoutLog = (namespace: string): debug.IDebugger => {
  const log = debug(namespace)
  // eslint-disable-next-line no-console
  log.log = console.log.bind(console)
  return log
}

export const onelineUtilInspect = (v: any): string => {
  return inspect(v, { colors: true })
    .split('\n')
    .map((s) => s.trim())
    .join(' ')
}

/*
 * Persistent Pino Logger setup
 */

// Environment variables
const cwd = process.cwd()
const env = process.env

let LOG_LOCATION: string
if (!env.PROJ_PINO_LOG) {
  const timestamp = new Date().toISOString()
  env.PROJ_PINO_LOG = `${cwd}/logs/${timestamp}`
  LOG_LOCATION = `${env.PROJ_PINO_LOG}/_master`
} else {
  LOG_LOCATION = `${env.PROJ_PINO_LOG}/${process.pid}`
}

/*
  read env var - if it is present, then set log location to be subpath of that env var
  otherwise choose log location and set env var to that value.
 */

// Create a stream where the logs will be written
export const logThrough = new stream.PassThrough()
export const log = pino(PINO_OPTIONS, logThrough)
export default log

// Log pretty messages to console (optional, for development purposes only)
const pretty = pino.pretty(PINO_PRETTY_OPTIONS)
logThrough.pipe(pretty).pipe(process.stdout)

const main = async () => {
  await mkdirp(LOG_LOCATION)

  // Log to multiple files using a separate process
  const child = childProcess.spawn(
    process.execPath,
    [
      require.resolve('pino-tee'),
      'trace',
      `${LOG_LOCATION}/all.log`,
      'info',
      `${LOG_LOCATION}/info.log`,
      'error',
      `${LOG_LOCATION}/error.log`,
    ],
    { cwd, env },
  )

  logThrough.pipe(child.stdin)
}

main().catch((err) => log.error({ err }, 'error initializing log streams'))
