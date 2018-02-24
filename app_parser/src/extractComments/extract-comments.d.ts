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
  const x: ParseFn
  export = x

  interface ParseFn {
    /*
     * Extract comments from the given string
     */
    (str: string, options?: OptionsObject, transform?: transformFn): BlockComment[]

    block(str: string, options?: OptionsObject): BlockComment[]

    line(str: string, options?: OptionsObject): BlockComment[]

    first(str: string, options?: OptionsObject): BlockComment[]
  }

  type transformFn = (comment: object /*  */, options: OptionsObject) => string

  interface OptionsObject {
    first?: boolean
    banner?: boolean
    line?: boolean
    block?: boolean
    silent?: boolean
    context?: boolean
    stripProtected?: boolean
    keepProtected?: boolean
    filter?: (token: object /* token from npm module 'esprima-extract-comments' */) => boolean
  }

  class BlockComment {
    public type: string
    public range: object
    public loc: { start: { line: number; pos: number }; end: { line: number; pos: number } }
    public raw: string
    public value: string
    public code?: object

    public constructor(str: string, token: any /* todo change */)
  }
}
