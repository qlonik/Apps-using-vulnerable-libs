import req = require('request-promise-native')

// downloaded top 25 from https://gist.github.com/anvaka/8e8fa57c7ee1350e3491
// snapshot of the 01.most-dependent-upon.md is available in the app_parser folder
const TOP_LIST = `
    0. [lodash](https://www.npmjs.org/package/lodash) - 40915
    1. [request](https://www.npmjs.org/package/request) - 24087
    2. [chalk](https://www.npmjs.org/package/chalk) - 19054
    3. [async](https://www.npmjs.org/package/async) - 18712
    4. [commander](https://www.npmjs.org/package/commander) - 17076
    5. [express](https://www.npmjs.org/package/express) - 17040
    6. [underscore](https://www.npmjs.org/package/underscore) - 14583
    7. [debug](https://www.npmjs.org/package/debug) - 14371
    8. [bluebird](https://www.npmjs.org/package/bluebird) - 13492
    9. [react](https://www.npmjs.org/package/react) - 12228
    10. [moment](https://www.npmjs.org/package/moment) - 10887
    11. [mkdirp](https://www.npmjs.org/package/mkdirp) - 10126
    12. [colors](https://www.npmjs.org/package/colors) - 9084
    13. [fs-extra](https://www.npmjs.org/package/fs-extra) - 8994
    14. [through2](https://www.npmjs.org/package/through2) - 7875
    15. [glob](https://www.npmjs.org/package/glob) - 7843
    16. [react-dom](https://www.npmjs.org/package/react-dom) - 7631
    17. [yeoman-generator](https://www.npmjs.org/package/yeoman-generator) - 7609
    18. [minimist](https://www.npmjs.org/package/minimist) - 7268
    19. [body-parser](https://www.npmjs.org/package/body-parser) - 6961
    20. [q](https://www.npmjs.org/package/q) - 6917
    21. [babel-runtime](https://www.npmjs.org/package/babel-runtime) - 6747
    22. [jquery](https://www.npmjs.org/package/jquery) - 6666
    23. [gulp-util](https://www.npmjs.org/package/gulp-util) - 6137
    24. [yargs](https://www.npmjs.org/package/yargs) - 6133
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
