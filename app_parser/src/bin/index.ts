import { readdir } from 'fs-extra'
import { kebabCase } from 'lodash'
import * as yargs from 'yargs'
import logger from '../utils/logger'
import { stripIllegalNames } from './_strip-illegal-names'

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
      logger.info({ script: kebabedScriptName }, 'master process')

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
        logger.error({ script: kebabedScriptName, err }, 'global error from main()')
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

      logger.info({ names }, 'available commands')
    },
  )
  .help()
  .alias('help', 'h')
  .alias('version', 'v')
  .parse()
