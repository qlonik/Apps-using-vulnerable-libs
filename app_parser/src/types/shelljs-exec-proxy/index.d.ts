declare module 'shelljs-exec-proxy' {
  import shelljs = require('shelljs');

  interface exec {
    (...command: string[]): shelljs.ExecOutputReturnValue;
    [k: string]: exec;
  }

  interface shelljs {
    [k: string]: exec
  }

  const exported: shelljs
  export = exported
}
