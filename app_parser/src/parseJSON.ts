import req from 'request-promise-native'
import { inspect } from 'util'

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
  'prop-types',
  'cheerio',
  'babel-core',
  'inquirer',
  'webpack',
  'coffee-script',
  'classnames',
  'rxjs',
  'uuid',
  'gulp',
  'semver',
  'yosay',
  'object-assign',
  'rimraf',
  'winston',
  'babel-preset-es2015',
  'shelljs',
  'ember-cli-babel',
  'socket.io',
  'js-yaml',
  'optimist',
  '@angular/core',
  'axios',
  'babel-loader',
  'mocha',
  'vue',
  'superagent',
  'handlebars',
  'co',
  'zone.js',
  'core-js',
  '@angular/common',
  'ejs',
  'redis',
  'mongodb',
  'babel-polyfill',
  'xml2js',
  'redux',
  'node-uuid',
  'eslint',
  'css-loader',
  'mongoose',
  '@angular/platform-browser',
  'extend',
  'aws-sdk',
  '@angular/compiler',
  'chai',
  'morgan',
  'style-loader',
  'ws',
  '@angular/http',
  'jade',
  'mime',
  'uglify-js',
  'path',
  '@angular/platform-browser-dynamic',
  '@angular/forms',
  'promise',
  'cookie-parser',
  'marked',
  'ramda',
  'babel-preset-react',
  'request-promise',
  'react-redux',
  '@angular/router',
  'postcss',
  'babel-eslint',
  'bootstrap',
  'file-loader',
  'es6-promise',
  'chokidar',
  'underscore.string',
  'meow',
  'minimatch',
  'less',
]

const PROCESSING: string[] = []

async function main() {
  const nameVersions = await TOP_LIST.reduce(async (acc, name) => {
    if (!name) {
      return acc
    }

    if (FINISHED.includes(name)) {
      return acc
    }

    PROCESSING.push(name)

    const json = JSON.parse(await req(`https://registry.npmjs.org/${name.replace('/', '%2F')}`))
    const versions = Object.keys(json.versions)
    return (await acc).concat(versions.map((version) => `${name}@${version}`))
  }, <Promise<string[]>>Promise.resolve([]))
  return { cmd: 'npm pack ' + nameVersions.join(' '), processing: PROCESSING }
}

main()
  .then(({ cmd, processing }) => {
    console.log(inspect(processing))
    console.log(cmd)
  })
  .catch((err) => console.log(err))
