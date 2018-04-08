import { test } from 'ava'
import { clone, shuffle } from 'lodash/fp'
import { check } from '../../_helpers/property-test'
import { jaccardLikeWithMapping } from '../set'
import { arbLiteralSignature } from './_test-data'
import { librarySimilarityByLiteralValues } from './lit-values'
import { DefiniteMap } from './types'

test(
  'calling with array === calling with object',
  check(arbLiteralSignature, arbLiteralSignature, (t, unknown, lib) => {
    t.deepEqual(
      librarySimilarityByLiteralValues(clone(unknown), clone(lib)),
      librarySimilarityByLiteralValues(
        { literalSignature: clone(unknown) },
        { literalSignature: clone(lib) },
      ),
    )
  }),
)

test(
  'produces expected value',
  check(
    { size: 150 },
    arbLiteralSignature,
    arbLiteralSignature,
    arbLiteralSignature,
    (t, unknownDistinct, intersection, libDistinct) => {
      const unknown = shuffle(unknownDistinct.concat(intersection))
      const lib = shuffle(intersection.concat(libDistinct))

      const { similarity, mapping: origMap } = librarySimilarityByLiteralValues(unknown, lib)

      const mapping = new Map() as DefiniteMap<number, number>
      origMap.forEach(({ index }, key) => mapping.set(key, index))

      t.deepEqual(jaccardLikeWithMapping(unknown, lib), { similarity, mapping })
    },
  ),
)
