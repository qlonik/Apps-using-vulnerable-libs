declare module 'shelljs-exec-proxy' {
  import Shelljs from 'shelljs'

  interface Exec {
    (...command: string[]): Shelljs.ExecOutputReturnValue
    [k: string]: Exec
  }

  interface Shelljs {
    [k: string]: Exec
  }

  const exported: Shelljs
  export = exported
}
