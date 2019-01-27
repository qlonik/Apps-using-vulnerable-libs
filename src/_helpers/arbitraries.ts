import { SourceLocation } from 'babel-types'
import arb from 'jsverify'
import shuffle from 'lodash/fp/shuffle'
import R from 'ramda'
import {
  fnNamesConcat,
  fnNamesSplit,
  FunctionSignature,
  LiteralSignature,
  signatureWithComments,
} from '../extractStructure'
import { repeatedDifference, repeatedIntersection } from '../similarityIndex/repeated-list-ops'
import { divByZeroIsOne, indexValue } from '../similarityIndex/set'
import { DefiniteMap, probIndex } from '../similarityIndex/similarity-methods/types'
import { indexedMap } from '../utils/functional'

export const arbMap = arb
  .nearray(arb.pair(arb.nat, arb.nat))
  .smap(R.uniqBy((x) => x[0]), R.identity)
  .smap(R.uniqBy((x) => x[1]), R.identity)
  .smap(R.sortBy((x) => x[0]), R.identity)
  .smap((arr) => new Map(arr), (map) => [...map])

export const arbIndexValue = arb
  .suchthat(arb.pair(arb.nat, arb.nat), ([num, den]) => num <= den)
  .smap<indexValue>(
    ([num, den]) => ({ val: divByZeroIsOne(num, den), num, den }),
    ({ num, den }) => [num, den],
  )

export const arbMapWithConfidence = arb
  .nearray(arb.pair(arb.nat, arb.record({ index: arb.nat, prob: arbIndexValue })))
  .smap(R.uniqBy((x) => x[0]), R.identity)
  .smap(R.uniqBy((x) => x[1].index), R.identity)
  .smap(R.sortBy((x) => x[0]), R.identity)
  .smap((arr) => new Map(arr) as DefiniteMap<number, probIndex>, (map) => [...map])

export const arraysPair = <T>(
  a: arb.Arbitrary<T>,
  arr: <U>(x: arb.Arbitrary<U>) => arb.Arbitrary<U[]> = arb.array,
): arb.Arbitrary<[T[], T[]]> =>
  arb.tuple([arr(a), arr(a), arr(a)]).smap<[T[], T[]]>(
    ([one, intersection, two]) => [
      shuffle(one.concat(intersection)),
      shuffle(two.concat(intersection)),
    ],
    ([one, two]) => {
      const intersection = repeatedIntersection(R.equals, one, two)
      return [
        repeatedDifference(R.equals, one, intersection),
        intersection,
        repeatedDifference(R.equals, two, intersection),
      ]
    },
  )

const arbLineColumn = arb.record({
  line: arb.nat,
  column: arb.nat,
})
export const arbLocation = arb.record<SourceLocation>({
  start: arbLineColumn,
  end: arbLineColumn,
})

const indAM = (v: FunctionSignature, index: number): FunctionSignature => ({ ...v, index })
const unInd = (v: FunctionSignature): FunctionSignature => ({ ...v, index: -1 })

const arbFunctionSignature = arb.record<FunctionSignature>({
  index: arb.constant(-1),
  type: arb.constant('fn') as arb.Arbitrary<'fn'>,
  name: arb
    .nearray(arb.either(arb.constant('[anonymous]'), arb.asciinestring))
    .smap(
      R.map((v) => (v as any).value as typeof v),
      R.map((v) => (v === '[anonymous]' ? (arb as any).left(v) : (arb as any).right(v))),
    )
    .smap(R.reduce(fnNamesConcat, '' as string), fnNamesSplit),
  loc: arbLocation,
  fnStatementTokens: arb.array(arb.asciinestring),
  fnStatementTypes: arb.array(arb.asciinestring),
})
export const arbFunctionSignatureArr = arb
  .nearray(arbFunctionSignature)
  .smap(indexedMap(indAM), R.map(unInd))
export const arbFunctionSignatureArrPair = arraysPair(arbFunctionSignature).smap(
  ([a, b]): [FunctionSignature[], FunctionSignature[]] => [a.map(indAM), b.map(indAM)],
  ([a, b]) => [a.map(unInd), b.map(unInd)],
)

const arbLiteralSignature = arb
  .either(arb.asciistring, arb.number)
  .smap<LiteralSignature>(
    (v) => (v as any).value as typeof v,
    (v) => (typeof v === 'string' ? (arb as any).left(v) : (arb as any).right(v)),
  )
export const arbLiteralSignatureArr = arb.nearray(arbLiteralSignature)
export const arbLiteralSignatureArrPair = arraysPair(arbLiteralSignature)

export const arbSignatureWithCommentsPair = arb
  .tuple([arbFunctionSignatureArrPair, arbLiteralSignatureArrPair, arraysPair(arb.asciinestring)])
  .smap<[signatureWithComments, signatureWithComments]>(
    ([fn, lit, com]) => [
      { functionSignature: fn[0], literalSignature: lit[0], comments: com[0] },
      { functionSignature: fn[1], literalSignature: lit[1], comments: com[1] },
    ],
    ([a, b]) => [
      [a.functionSignature, b.functionSignature],
      [a.literalSignature, b.literalSignature],
      [a.comments, b.comments],
    ],
  )

const sqrtsize = (size: number) => {
  return Math.max(Math.round(Math.sqrt(size + 1)), 0)
}
const minArrSizeGeneratorFn = (min: number) =>
  /**
   * Returns array of arbitraries passed as parameter. This array has property,
   * that already generated elements could be included again with 20% probability.
   * @param a
   */
  function<T>(a: arb.Arbitrary<T>): arb.Arbitrary<T[]> {
    if (!a.shrink) {
      throw new Error('no shrink on arbitrary')
    }
    return arb.bless({
      generator: arb.generator.bless(function(size: number) {
        const arrsize = arb.random(min, sqrtsize(size))
        const arr = []
        if (arrsize > 0) {
          arr.push(a.generator(size))
          for (let i = 0; i < arrsize - 1; i++) {
            switch (arb.random(0, 4)) {
              case 0:
                arr.push(arr[arb.random(0, arr.length - 1)])
                break
              default:
                arr.push(a.generator(size))
                break
            }
          }
        }
        return arr
      }),
      shrink: arb.shrink.array(a.shrink),
    })
  }
export const repeatingArr = minArrSizeGeneratorFn(0)
export const repeatingNeArr = minArrSizeGeneratorFn(1)

const minSizeLargeArrayGeneratorFn = (min: number) =>
  /**
   * Returns array of arbitraries passed as parameter. The length of this array
   * directly corresponds to the size property passed
   * @param a
   */
  function largeArrayGenerator<T>(a: arb.Arbitrary<T>): arb.Arbitrary<T[]> {
    if (!a.shrink) {
      throw new Error('no shrink on arbitrary')
    }
    return arb.bless({
      generator: arb.generator.bless(function(size: number) {
        const arrsize = arb.random(min, size)
        const arr = []
        for (let i = 0; i < arrsize; i++) {
          arr.push(a.generator(size))
        }
        return arr
      }),
      shrink: arb.shrink.array(a.shrink),
    })
  }
export const largeArr = minSizeLargeArrayGeneratorFn(0)
export const largeNeArr = minSizeLargeArrayGeneratorFn(1)
