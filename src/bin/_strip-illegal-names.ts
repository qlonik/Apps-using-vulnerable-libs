import kebabCase from 'lodash/fp/kebabCase'
import { resolve } from 'path'

const last = <T>(list: T[]): T => list[list.length - 1]

export function transformAndCleanScriptNames(scripts: string[], allowedDirs: string[] = []) {
  return scripts
    .map((name) => resolve('/', name).slice(1))
    .map((name) => name.split('/'))
    .filter(
      // remove stuff in folders, unless test, or one of the allowed folders
      (nameparts) =>
        process.env.NODE_ENV === 'test' ||
        nameparts.length === 1 ||
        (nameparts.length === 2 && allowedDirs.includes(nameparts[0])),
    )
    .filter(
      // remove those that have illegal file names
      (nameparts) => {
        const name = last(nameparts)
        return !name.startsWith('_') && !name.endsWith('.d.ts') && !name.endsWith('.js.map')
      },
    )
    .map((nameparts) =>
      nameparts.slice(0, nameparts.length - 1).concat(last(nameparts).replace(/\.(t|j)sx?$/, '')),
    )
    .filter((nameparts) => {
      const name = last(nameparts)
      return name !== 'index' && !name.endsWith('.worker') && !name.endsWith('.test')
    })
    .map((nameparts) => nameparts.map(kebabCase))
    .map((nameparts) => nameparts.join('/'))
}
