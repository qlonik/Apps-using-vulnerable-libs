import { Logger } from 'pino'

export type MainFn = (log: Logger) => Promise<any>
export type TerminateFn = (signal: 'SIGINT') => void
