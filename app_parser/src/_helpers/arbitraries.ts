import arb from 'jsverify'
import { clone, differenceWith, identity, intersectionWith, isEqual, shuffle, uniqBy } from 'lodash'
import {
  CommentSignature,
  fnNamesConcat,
  fnNamesSplit,
  FunctionSignature,
  LiteralSignature,
} from '../extractStructure'
import { indexValue } from '../similarityIndex/set'
import { DefiniteMap, probIndex } from '../similarityIndex/similarity-methods/types'

export const arbPairs: arb.Arbitrary<[number, number][]> = arb
  .nearray(arb.pair(arb.nat, arb.nat))
  .smap((arr) => uniqBy(arr, (x) => x[0]), identity)
  .smap((arr) => uniqBy(arr, (x) => x[1]), identity)
  .smap((arr) => clone(arr).sort((p1, p2) => p1[0] - p2[0]), identity)

export const arbIndexValue = arb
  .either(
    arb.pair(arb.constant(0), arb.constant(0)),
    arb.pair(arb.nat, arb.nat.smap((x) => x + 1, (x) => x - 1)),
  )
  .smap(
    (either: any /* Either = Left<[number, number]> | Right<[number, number]> */): indexValue =>
      either.either(
        ([x, y]: [number, number]) => ({ val: 1, num: x, den: y }),
        ([x, y]: [number, number]) => ({ val: x / y, num: x, den: y }),
      ),
    (indVal) => {
      const { num: x, den: y } = indVal
      return x === 0 && y === 0 ? (arb as any).left([x, y]) : (arb as any).right([x, y])
    },
  )

export const arbMapWithConfidence = arb
  .nearray(arb.pair(arb.nat, arb.record({ index: arb.nat, prob: arbIndexValue })))
  .smap((arr) => uniqBy(arr, (x) => x[0]), identity)
  .smap((arr) => uniqBy(arr, (x) => x[1].index), identity)
  .smap((arr) => clone(arr).sort((p1, p2) => p1[0] - p2[0]), identity)
  .smap((arr) => new Map(arr) as DefiniteMap<number, probIndex>, (map) => [...map])

export const arraysPair = <T>(a: arb.Arbitrary<T>): arb.Arbitrary<[T[], T[]]> => {
  return arb
    .tuple([arb.nearray(a), arb.either(arb.constant([]), arb.nearray(a)), arb.nearray(a)])
    .smap(
      ([one, intersection, two]: [T[], any, T[]]): [T[], T[]] => [
        shuffle(one.concat(intersection.value)),
        shuffle(two.concat(intersection.value)),
      ],
      ([one, two]) => {
        const intersection = intersectionWith(one, two, isEqual)
        const either =
          intersection.length === 0
            ? (arb as any).left(intersection)
            : (arb as any).right(intersection)
        return [
          differenceWith(one, intersection, isEqual),
          either,
          differenceWith(two, intersection, isEqual),
        ]
      },
    )
}

export const arbFunctionSignature = arb.record({
  type: arb.constant('fn'),
  name: arb
    .nearray(arb.either(arb.constant('[anonymous]'), arb.asciinestring))
    .smap(
      (arr) => arr.map((v: any): string => v.value),
      (arr) => arr.map((v) => (v === '[anonymous]' ? (arb as any).left(v) : (arb as any).right(v))),
    )
    .smap((a) => a.reduce(fnNamesConcat, ''), fnNamesSplit),
  fnStatementTokens: arb.array(arb.asciinestring),
  fnStatementTypes: arb.array(arb.asciinestring),
}) as arb.Arbitrary<FunctionSignature>
export const arbFunctionSignatureArr = arb.nearray(arbFunctionSignature)
export const arbFunctionSignatureArrPair = arraysPair(arbFunctionSignature)

export const arbLiteralSignature = arb
  .either(arb.asciistring, arb.number)
  .smap(
    (v: any): string | number => v.value,
    (v) => (typeof v === 'string' ? (arb as any).left(v) : (arb as any).right(v)),
  ) as arb.Arbitrary<LiteralSignature>
export const arbLiteralSignatureArr = arb.nearray(arbLiteralSignature)
export const arbLiteralSignatureArrPair = arraysPair(arbLiteralSignature)

export const arbCommentSignature = arb
  .either(arb.asciinestring, arb.nearray(arb.asciinestring))
  .smap(
    (v: any): string | string[] => v.value,
    (v) => (typeof v === 'string' ? (arb as any).left(v) : (arb as any).right(v)),
  ) as arb.Arbitrary<CommentSignature>
export const arbCommentSignatureArr = arb.nearray(arbCommentSignature)
export const arbCommentSignatureArrPair = arraysPair(arbCommentSignature)
