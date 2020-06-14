import test from 'ava'
import { sortBy, padEnd, round } from 'lodash'
import R from 'ramda'
import { arbMapWithConfidence } from '../src/_helpers/arbitraries'
import { check } from '../src/_helpers/property-test'
import { DefiniteMap, probIndex } from '../src/similarityIndex/similarity-methods/types'

const ramdaSort = R.pipe(
  (mapping: DefiniteMap<number, probIndex>) => [...mapping.entries()],
  R.map(([key, { index, prob }]) => {
    const paddedMap = padEnd(`${key}->${index}`, 12)
    const roundAndPad = (n: number) => padEnd(`${round(n, 6)},`, 9)
    const paddedProb = `val: ${roundAndPad(prob.val)} num: ${prob.num}, den: ${prob.den}`

    return { s: `${paddedMap} ({ ${paddedProb} })`, order: [-prob.val, key] }
  }),
  R.sortWith([(o1, o2) => o1.order[0] - o2.order[0], (o1, o2) => o1.order[1] - o2.order[1]]),
  R.map(({ s }) => ({ m: s, c: [] })),
)

const lodashSort = (mapping: DefiniteMap<number, probIndex>) => {
  type intermediate = { s: string; order: number[] }
  return sortBy(
    [...mapping.keys()].map(
      (key): intermediate => {
        const { index, prob } = mapping.get(key)

        const paddedMap = padEnd(`${key}->${index}`, 12)
        const roundAndPad = (n: number) => padEnd(`${round(n, 6)},`, 9)
        const paddedProb = `val: ${roundAndPad(prob.val)} num: ${prob.num}, den: ${prob.den}`

        return { s: `${paddedMap} ({ ${paddedProb} })`, order: [-prob.val, key] }
      },
    ),
    [(o: intermediate) => o.order[0], (o: intermediate) => o.order[1]],
  ).map(({ s }: intermediate) => ({ m: s, c: [] }))
}

test(
  'lodash and ramda sort same way',
  check({ tests: 500 }, arbMapWithConfidence, async (t, map) => {
    t.deepEqual(R.clone(ramdaSort(map)), R.clone(lodashSort(map)))
  }),
)
