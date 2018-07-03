import ChangesStream from 'changes-stream'
import { createWriteStream, WriteStream } from 'fs'
import { flow, once } from 'lodash/fp'
import { join } from 'path'
import { pipe } from 'rxjs'
import { map, partition } from 'rxjs/operators'
import { valid } from 'semver'
import { assert } from '../utils/logger'
import { streamToRx } from '../utils/observable'
import { MainFn, TerminateFn } from './_all.types'

const DB = ''
const outFilePath = join(process.env.OUT!, 'liblibNamesVersions.json')
const invalidDocsFilePath = join(process.env.OUT!, 'invalid-liblibNamesVersions.json')

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
export const main: MainFn = async function main(log) {
  const db = assert(DB, log, 'DB is not specified')

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
        !!id && !id.startsWith('_') && !id.startsWith('.') && !!doc.versions && !!doc.time,
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
          (a) => a.map((v) => ({ v, time: time[v] || '0' })),
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

export const terminate: TerminateFn = once(() => {
  terminateCall()
})
