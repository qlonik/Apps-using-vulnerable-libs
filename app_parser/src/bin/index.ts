import { kebabCase } from 'lodash'
import Module from 'module'
import { resolve } from 'path'
import * as yargs from 'yargs'

yargs
  .command(
    '$0 <script>',
    'execute bin script',
    (yargs) => {
      return yargs.positional('script', {
        desc: 'filename of the script',
        type: 'string',
      })
    },
    async (args) => {
      const kebabCaseName = kebabCase(args.script)
      const replExt = kebabCaseName.replace(/.(t|j)sx?$/, '.js')
      const jsScript = `${replExt}${replExt.endsWith('.js') ? '' : '.js'}`
      const scriptPath = resolve(__dirname, jsScript)

      process.argv = [process.argv[0], scriptPath]
      // Magic found in npx source code:
      // https://github.com/zkat/npx/blob/357e6abc49077d7e4325406852d182220816e4f2/index.js#L264
      Module.runMain()
    },
  )
  .help().argv
