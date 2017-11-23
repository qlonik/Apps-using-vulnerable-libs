// Type definitions for extract-comments v0.10.1
// Project: extract-comments by jonschlinkert <https://github.com/jonschlinkert/extract-comments>
// Definitions by: qlonik <https://github.com/qlonik>

/*~ This is the module template file for function modules.
 *~ You should rename it to index.d.ts and place it in a folder with the same name as the module.
 *~ For example, if you were writing a file for "super-greeter", this
 *~ file should be 'super-greeter/index.d.ts'
 */

/*~ Note that ES6 modules cannot directly export callable functions.
 *~ This file should be imported using the CommonJS-style:
 *~   import x = require('someLibrary');
 *~
 *~ Refer to the documentation to understand common
 *~ workarounds for this limitation of ES6 modules.
 */

/*~ This declaration specifies that the function
 *~ is the exported object from the file
 */

declare module 'extract-comments' {
  const x: any
  export = <ParseFn> x

  interface ParseFn {
    /*
     * Extract comments from the given string
     */
    (
      str: string,
      options?: extractModule.OptionsObject,
      transform?: extractModule.transformFn): extractModule.BlockComment[]

    block(str: string, options?: extractModule.OptionsObject): extractModule.BlockComment[]

    line(str: string, options?: extractModule.OptionsObject): extractModule.BlockComment[]

    first(str: string, options?: extractModule.OptionsObject): extractModule.BlockComment[]
  }

  namespace extractModule {
    export type transformFn = (comment: object /*  */, options: OptionsObject) => string

    export interface OptionsObject {
      first?: boolean,
      banner?: boolean,
      line?: boolean,
      block?: boolean,
      silent?: boolean,
      context?: boolean,
      stripProtected?: boolean,
      keepProtected?: boolean,
      filter?: (token: object /* token from npm module 'esprima-extract-comments' */) => boolean,

    }

    export class BlockComment {
      type: string
      range: object
      loc: { start: { line: number, pos: number }, end: { line: number, pos: number } }
      raw: string
      value: string
      code?: object

      constructor(str: string, token: any /* todo change */)

    }
  }
}
