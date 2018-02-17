declare module 'shelljs-exec-proxy' {
  import { ChildProcess } from 'child_process'
  import shelljs = require('shelljs');

  interface exec {
    (command?: string): shelljs.ExecOutputReturnValue;

    (options: shelljs.ExecOptions): shelljs.ExecOutputReturnValue | ChildProcess;
    (command: string, options: shelljs.ExecOptions): shelljs.ExecOutputReturnValue | ChildProcess;

    (options: shelljs.ExecOptions, callback: shelljs.ExecCallback): ChildProcess;
    (command: string, options: shelljs.ExecOptions, callback: shelljs.ExecCallback): ChildProcess;

    (callback: shelljs.ExecCallback): ChildProcess;
    (command: string, callback: shelljs.ExecCallback): ChildProcess;

    [k: string]: exec;
  }

  interface shelljs {
    [k: string]: exec
  }

  const exported: shelljs
  export = exported
}
