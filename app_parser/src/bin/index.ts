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
        const err = new Error('illegal bin script')
        logger.error({ script: args.script, err })
        throw err
      }
      const kebabedScriptName = script
        .split('/')
        .map(kebabCase)
        .join('/')
      const scriptName = `./${kebabedScriptName}`

      const module = await import(scriptName)
      if (typeof module.main !== 'function') {
        const err = new TypeError('no main exported')
        logger.error({ script: kebabedScriptName, err })
        throw err
      }
      if (typeof module.terminate === 'function') {
        process.on('SIGINT', module.terminate)
      }

      logger.info({ script: kebabedScriptName }, 'master process')
      try {
        await module.main()
      } catch (err) {
        logger.error({ script: kebabedScriptName, err }, 'global error from main()')
        throw err
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
  .showHelpOnFail(false, 'Specify -h for available commands')
  .alias('help', 'h')
  .alias('version', 'v')
  .parse()
