import childProcess from 'child_process'
import { mkdirp } from 'fs-extra'
import pino from 'pino'
import stream from 'stream'

const PINO_OPTIONS: pino.LoggerOptions = {}
const PINO_PRETTY_OPTIONS: pino.PrettyOptions = {
  forceColor: true,
}

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
