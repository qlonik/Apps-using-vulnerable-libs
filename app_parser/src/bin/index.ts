import { inlineLists } from 'common-tags'
import { unload } from 'freshy'
import { readdir } from 'fs-extra'
import { kebabCase } from 'lodash'
import Module from 'module'
import { resolve } from 'path'
import * as yargs from 'yargs'
import { stdoutLog } from '../utils/logger'

const log = stdoutLog('bin')
log.enabled = true

function stripIllegalNames(scripts: string[]) {
  return scripts
    .filter((name) => !name.endsWith('.d.ts') && !name.endsWith('.js.map'))
    .map((name) => name.replace(/.(t|j)sx?$/, ''))
    .filter((name) => name !== 'index' && !name.endsWith('.worker') && !name.endsWith('.test'))
}

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
      const [script] = stripIllegalNames([args.script])
      if (script === null) {
        throw new Error('illegal bin script')
      }
      const scriptName = `./` + kebabCase(script)
      const scriptPath = resolve(__dirname, scriptName)

      const module = await import(scriptName)
      if ('main' in module && typeof module.main === 'function') {
        if ('terminate' in module && typeof module.terminate === 'function') {
          process.on('SIGINT', module.terminate)
        }

        try {
          await module.main()
        } catch (err) {
          log('Some global error:\n%s', err.stack)
        }
      } else {
        unload(scriptName)
        process.argv = [process.argv[0], scriptPath]
        // Magic found in npx source code:
        // https://github.com/zkat/npx/blob/357e6abc49077d7e4325406852d182220816e4f2/index.js#L264
        Module.runMain()
      }
    },
  )
  .command(
    'list',
    'list bin scripts',
    (yargs) => {
      return yargs
    },
    async () => {
      const scripts = await readdir(__dirname)
      const names = stripIllegalNames(scripts)

      log(inlineLists`Available commands:\n   ${names}`)
    },
  )
  .help()
  .alias('help', 'h')
  .alias('version', 'v')
  .parse()
