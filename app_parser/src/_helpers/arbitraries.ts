import arb from 'jsverify'
import { uniqBy, identity, clone } from 'lodash'
import {
  CommentSignature,
  fnNamesConcat,
  fnNamesSplit,
  FunctionSignature,
  LiteralSignature,
} from '../extractStructure'

export const arbPairs: arb.Arbitrary<[number, number][]> = arb
  .nearray(arb.pair(arb.nat, arb.nat))
  .smap((arr) => uniqBy(arr, (x) => x[0]), identity)
  .smap((arr) => uniqBy(arr, (x) => x[1]), identity)
  .smap((arr) => clone(arr).sort((p1, p2) => p1[0] - p2[0]), identity)

export const arbFunctionSignature = arb.record({
  type: arb.constant('fn'),
  name: arb
    .nearray(arb.oneof([arb.asciinestring, arb.constant('[anonymous]')]))
    .smap((a) => a.reduce(fnNamesConcat, ''), fnNamesSplit),
  fnStatementTokens: arb.array(arb.asciinestring),
  fnStatementTypes: arb.array(arb.asciinestring),
}) as arb.Arbitrary<FunctionSignature>
export const arbFunctionSignatureArr = arb.nearray(arbFunctionSignature)

export const arbLiteralSignature = arb.oneof<any>([arb.number, arb.asciistring]) as arb.Arbitrary<
  LiteralSignature
>
export const arbLiteralSignatureArr = arb.nearray(arbLiteralSignature)

export const arbCommentSignature = arb.oneof<any>([
  arb.asciinestring,
  arb.nearray(arb.asciinestring),
]) as arb.Arbitrary<CommentSignature>
export const arbCommentSignatureArr = arb.nearray(arbCommentSignature)
