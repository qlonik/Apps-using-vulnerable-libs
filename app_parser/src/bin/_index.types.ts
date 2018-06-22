export type MainFn = () => Promise<any>
export type TerminateFn = (signal: 'SIGINT') => void
