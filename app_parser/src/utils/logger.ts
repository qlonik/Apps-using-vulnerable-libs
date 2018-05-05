import debug from 'debug'
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

// Create a stream where the logs will be written
const logThrough = new stream.PassThrough()

export const log = pino(PINO_OPTIONS, logThrough)
export default log

// Log pretty messages to console (optional, for development purposes only)
const pretty = pino.pretty(PINO_PRETTY_OPTIONS)

logThrough.pipe(process.stderr)
logThrough.pipe(pretty).pipe(process.stdout)
