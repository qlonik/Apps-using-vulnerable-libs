import req = require('request-promise-native')

// list of top depended upon from https://gist.github.com/anvaka/8e8fa57c7ee1350e3491
const TOP_LIST = `
  `
  .split('\n')
  .map((v) => {
    const regex = /.*\[(.*)]\(.*\).*/
    const match = regex.exec(v)
    if (match) {
      return match[1]
    }
  })
  .filter((v: string | void) => v && v.trim())

const FINISHED = [
  'lodash',
  'request',
  'chalk',
  'async',
  'commander',
  'express',
  'underscore',
  'debug',
  'bluebird',
  'react',
  'moment',
  'mkdirp',
  'colors',
  'fs-extra',
  'through2',
  'glob',
  'react-dom',
  'yeoman-generator',
  'minimist',
  'body-parser',
  'q',
  'babel-runtime',
  'jquery',
  'gulp-util',
  'yargs',
]

async function main() {
  const nameVersions = await TOP_LIST.reduce(async (acc, name) => {
    if (!name) {
      return acc
    }

    if (FINISHED.includes(name)) {
      return acc
    }

    const json = JSON.parse(await req(`https://registry.npmjs.org/${name}`))
    const versions = Object.keys(json.versions)
    return (await acc).concat(versions.map((version) => `${name}@${version}`))
  }, <Promise<string[]>>Promise.resolve([]))
  return 'npm pack ' + nameVersions.join(' ')
}

main()
  .then((cmd) => console.log(cmd))
  .catch((err) => console.log(err))
