import { test } from 'ava'
import { arbLiteralSignatureArr, arbLiteralSignatureArrPair } from '../../_helpers/arbitraries'
import { check } from '../../_helpers/property-test'
import { invertMapWithConfidence, jaccardLikeWithMapping } from '../set'
import { librarySimilarityByLiteralValues } from './lit-values'
import { DefiniteMap } from './types'

test(
  'calling with array === calling with object',
  check(arbLiteralSignatureArrPair, (t, [u, l]) => {
    t.deepEqual(
      librarySimilarityByLiteralValues(u, l),
      librarySimilarityByLiteralValues({ literalSignature: u }, { literalSignature: l }),
    )
  }),
)

test(
  'produces expected value',
  check({ size: 150 }, arbLiteralSignatureArrPair, (t, [unknown, lib]) => {
    const { similarity, mapping: origMap } = librarySimilarityByLiteralValues(unknown, lib)

    // remove prob from librarySimilarityByLiteralValues mapping
    // to compare with jaccardLikeWithMapping
    const mapping = new Map() as DefiniteMap<number, number>
    origMap.forEach(({ index }, key) => mapping.set(key, index))

    t.deepEqual(jaccardLikeWithMapping(unknown, lib), { similarity, mapping })
  }),
)

test(
  'commutative',
  check({ size: 150 }, arbLiteralSignatureArrPair, (t, [a, b]) => {
    const { similarity: simAB, mapping: mappingAB } = librarySimilarityByLiteralValues(a, b)
    const { similarity: simBA, mapping: mappingBA } = librarySimilarityByLiteralValues(b, a)

    t.deepEqual(simAB, simBA)
    t.deepEqual(mappingAB, invertMapWithConfidence(mappingBA))
  }),
)

test(
  'produces 0% match when comparing with empty signature',
  check(arbLiteralSignatureArr, (t, unknown) => {
    const { similarity, mapping } = librarySimilarityByLiteralValues(unknown, [])

    t.is(0, similarity.val)
    t.is(0, similarity.num)
    t.not(0, similarity.den)
    t.deepEqual(new Map(), mapping)
  }),
)

test('produces 0% match when comparing empty signatures', t => {
  t.deepEqual(
    { similarity: { val: 0, num: 0, den: 0 }, mapping: new Map() },
    librarySimilarityByLiteralValues([], []),
  )
})

test(
  'produces 100% match when comparing same signatures',
  check(arbLiteralSignatureArr, (t, a) => {
    const { similarity: { val, num, den }, mapping } = librarySimilarityByLiteralValues(a, a)

    t.is(1, val)
    t.is(num, den)
    t.is(a.length, mapping.size)
    for (let [from, { index: to, prob: { val, num, den } }] of mapping) {
      t.is(from, to)
      t.is(1, val)
      t.is(num, den)
    }
  }),
)
