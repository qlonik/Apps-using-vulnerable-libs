import { inlineLists } from 'common-tags'
import { readdir } from 'fs-extra'
import { kebabCase } from 'lodash'
import * as yargs from 'yargs'
import { stdoutLog } from '../utils/logger'
import { stripIllegalNames } from './_strip-illegal-names'

const log = stdoutLog('bin')
log.enabled = true

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
      if (!script) {
        throw new Error('illegal bin script')
      }
      const kebabedScriptName = script
        .split('/')
        .map(kebabCase)
        .join('/')
      const scriptName = `./${kebabedScriptName}`

      const module = await import(scriptName)
      if (typeof module.main !== 'function') {
        throw new TypeError('no main exported')
      }
      if (typeof module.terminate === 'function') {
        process.on('SIGINT', module.terminate)
      }

      try {
        await module.main()
      } catch (err) {
        log('Some global error:\n%s', err.stack)
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
