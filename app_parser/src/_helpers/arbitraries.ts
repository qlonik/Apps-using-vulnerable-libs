import { SourceLocation } from 'babel-types'
import arb from 'jsverify'
import {
  clone,
  differenceWith,
  identity,
  intersectionWith,
  isEqual,
  shuffle,
  uniqBy,
} from 'lodash/fp'
import {
  fnNamesConcat,
  fnNamesSplit,
  FunctionSignature,
  LiteralSignature,
  signatureWithComments,
} from '../extractStructure'
import { divByZeroAware, indexValue } from '../similarityIndex/set'
import { DefiniteMap, probIndex } from '../similarityIndex/similarity-methods/types'

/* eslint-disable no-unused-vars */
declare const __x: signatureWithComments
/* eslint-enable */

export const arbMap = arb
  .nearray(arb.pair(arb.nat, arb.nat))
  .smap((arr) => uniqBy((x) => x[0], arr), identity)
  .smap((arr) => uniqBy((x) => x[1], arr), identity)
  .smap((arr) => clone(arr).sort((p1, p2) => p1[0] - p2[0]), identity)
  .smap((arr): Map<number, number> => new Map(arr), (map) => [...map])

export const arbIndexValue = arb
  .suchthat(arb.pair(arb.nat, arb.nat), ([num, den]) => num <= den)
  .smap<indexValue>(
    ([num, den]) => ({ val: divByZeroAware(num, den), num, den }),
    ({ num, den }) => [num, den],
  )

export const arbMapWithConfidence = arb
  .nearray(arb.pair(arb.nat, arb.record({ index: arb.nat, prob: arbIndexValue })))
  .smap((arr) => uniqBy((x) => x[0], arr), identity)
  .smap((arr) => uniqBy((x) => x[1].index, arr), identity)
  .smap((arr) => clone(arr).sort((p1, p2) => p1[0] - p2[0]), identity)
  .smap((arr) => new Map(arr) as DefiniteMap<number, probIndex>, (map) => [...map])

export const arraysPair = <T>(a: arb.Arbitrary<T>): arb.Arbitrary<[T[], T[]]> => {
  return arb.tuple([arb.array(a), arb.array(a), arb.array(a)]).smap(
    ([one, intersection, two]: [T[], T[], T[]]): [T[], T[]] => [
      shuffle(one.concat(intersection)),
      shuffle(two.concat(intersection)),
    ],
    ([one, two]) => {
      const intersection = intersectionWith(isEqual, one, two)
      return [
        differenceWith(isEqual, one, intersection),
        intersection,
        differenceWith(isEqual, two, intersection),
      ]
    },
  )
}

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
      (arr) => arr.map((v) => (v as any).value as typeof v),
      (arr) => arr.map((v) => (v === '[anonymous]' ? (arb as any).left(v) : (arb as any).right(v))),
    )
    .smap((a) => a.reduce(fnNamesConcat, ''), fnNamesSplit),
  loc: arbLocation,
  fnStatementTokens: arb.array(arb.asciinestring),
  fnStatementTypes: arb.array(arb.asciinestring),
})
export const arbFunctionSignatureArr = arb
  .nearray(arbFunctionSignature)
  .smap((arr): FunctionSignature[] => arr.map(indAM), (arr) => arr.map(unInd))
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
