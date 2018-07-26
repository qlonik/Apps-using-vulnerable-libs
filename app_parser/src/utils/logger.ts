import cloneable from 'cloneable-readable'
import debug from 'debug'
import { createWriteStream } from 'fs'
import pino from 'pino'
import pump from 'pump'
import stream from 'stream'
import { inspect } from 'util'

/*
 * Config for Pino
 */
const PINO_OPTIONS: pino.LoggerOptions = {
  serializers: {
    err: pino.stdSerializers.err,
  },
}
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

/*
 * Persistent Pino Logger setup
 */

// Create a stream where the logs will be written
const logThrough = cloneable(new stream.PassThrough())

export const log = pino(PINO_OPTIONS, logThrough)
export default log

// Log pretty messages to console (optional, for development purposes only)
const pretty = pino.pretty(PINO_PRETTY_OPTIONS)

export const fd = parseInt(process.env.FD || '') || null
const outputStream = fd ? createWriteStream('', { fd }) : process.stderr

pump(logThrough.clone(), pretty, process.stdout)
pump(logThrough, outputStream)

export type falsy = false | '' | 0 | null | undefined
export function assert<T>(
  statement: T,
  _log: pino.Logger = log,
  msg: string = 'assertion error',
  level: pino.Level = 'error',
): Exclude<T, falsy> {
  if (!statement) {
    const err = new Error(msg)
    _log[level]({ err })
    throw err
  } else {
    return statement as Exclude<T, falsy>
  }
}
