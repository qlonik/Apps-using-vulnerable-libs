import ChangesStream from 'changes-stream'
import { createWriteStream, WriteStream } from 'fs'
import { flow, once } from 'lodash/fp'
import { join } from 'path'
import { pipe } from 'rxjs'
import { map, partition } from 'rxjs/operators'
import { valid } from 'semver'
import { streamToRx } from '../../utils/observable'
import { MainFn, TerminateFn } from '../_all.types'

export const OUT_FILE_NAME = 'liblibNamesVersions.json'
export const INVALID_FILE_NAME = 'invalid-liblibNamesVersions.json'

type docType = {
  id?: string
  doc: {
    name: string
    versions?: { [version: string]: any }
    time?: { [version: string]: string }
  }
}

const writeIntoFile = (w: WriteStream) => {
  let first = true
  return (o: {}) => {
    let comma = ','
    if (first) {
      first = false
      comma = ''
    }
    const line = comma + '\n  ' + JSON.stringify(o)
    w.write(line)
  }
}

let terminateCall: () => void

export const environment = {
  /**
   * Url to CouchDB
   *
   * @example
   *   'http://localhost:5984/scoped'
   */
  COUCH_DB: {},
}

export const main: MainFn<typeof environment> = async function main(log, { OUT, COUCH_DB: db }) {
  const outFilePath = join(OUT, OUT_FILE_NAME)
  const invalidDocsFilePath = join(OUT, INVALID_FILE_NAME)

  const writeFile = createWriteStream(outFilePath, {
    encoding: 'utf-8',
    autoClose: true,
  })
  const invalidWriteFile = createWriteStream(invalidDocsFilePath, {
    encoding: 'utf-8',
    autoClose: true,
  })

  writeFile.write('[')
  invalidWriteFile.write('[')

  const writeValid = writeIntoFile(writeFile)
  const writeInValid = writeIntoFile(invalidWriteFile)

  const changesStream = new ChangesStream({ db, include_docs: true })
  terminateCall = once(() => changesStream.destroy())

  const changes$ = streamToRx<docType>(changesStream)

  const [validDocs, invalidDocs] = pipe(
    partition(
      ({ id, doc }: docType) =>
        !!id && !id.startsWith('_') && !id.startsWith('.') && !!doc.versions,
    ),
  )(changes$)

  const validWaitPromise = validDocs
    .pipe(
      map(({ doc: { name, versions = {}, time = {} } }) => ({
        name,
        versions: flow(
          (a: string[], b: string[]) => a.concat(b),
          (a) => [...new Set(a)],
          (a) => a.filter((v) => !!valid(v)),
          (a) => a.map((v) => ({ v, time: time[v] || 'unknown' })),
        )(Object.keys(versions), Object.keys(time)),
      })),
    )
    .forEach(writeValid)

  const invalidWaitPromise = invalidDocs.forEach(writeInValid)

  await validWaitPromise
  await invalidWaitPromise

  writeFile.end('\n]\n')
  invalidWriteFile.end('\n]\n')
}

export const terminate: TerminateFn = (log) =>
  once(() => {
    log.info('started terminating')
    terminateCall()
  })
