import debug from 'debug'
import { inspect } from 'util'

/*
 * Logger setup
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
  log.log = console.log.bind(console)
  return log
}

export const onelineUtilInspect = (v: any): string => {
  return inspect(v, { colors: true })
    .split('\n')
    .map((s) => s.trim())
    .join(' ')
}
