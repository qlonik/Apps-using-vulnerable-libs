import { Fraction } from 'fraction.js'
import { FunctionSignature } from '../../extractStructure'
import { FractionToIndexValue } from '../fraction'
import { jaccardLike } from '../set'
import { DefiniteMap, probIndex } from './types'

export const UNKNOWN_SIG: FunctionSignature[] = [
  {
    index: 0,
    type: 'fn',
    name: 'aa',
    loc: {} as any,
    fnStatementTokens: ['1a', '1b', '1c', '1d'],
    fnStatementTypes: ['t_1a', 't_1b', 't_1c', 't_1d'],
  },
  {
    index: 1,
    type: 'fn',
    name: 'bb',
    loc: {} as any,
    fnStatementTokens: ['1a', '2b', '2c', '2d'],
    fnStatementTypes: ['t_1a', 't_2b', 't_2c', 't_2d'],
  },
  {
    index: 2,
    type: 'fn',
    name: 'cc',
    loc: {} as any,
    fnStatementTokens: ['3a', '3b', '3c', '3d', '3d'],
    fnStatementTypes: ['t_3a', 't_3b', 't_3c', 't_3d', 't_3d'],
  },
  {
    index: 3,
    type: 'fn',
    name: '[anonymous]',
    loc: {} as any,
    fnStatementTokens: ['4a', '4b', '4d', '4d'],
    fnStatementTypes: ['t_4a', 't_4b', 't_4d', 't_4d'],
  },
  {
    index: 4,
    type: 'fn',
    name: 'ee:>>:[anonymous]',
    loc: {} as any,
    fnStatementTokens: ['5a', '5b', '6a', '6b'],
    fnStatementTypes: ['t_5a', 't_5b', 't_6a', 't_6b'],
  },
  {
    index: 5,
    type: 'fn',
    name: 'ff:>>:[anonymous]',
    loc: {} as any,
    fnStatementTokens: ['5a', '5c', '5d', '5d', '6c', '6d', '6d'],
    fnStatementTypes: ['t_5a', 't_5c', 't_5d', 't_5d', 't_6c', 't_6d', 't_6d'],
  },
]
export const LIB_SIG: FunctionSignature[] = [
  {
    index: 0,
    type: 'fn',
    name: 'aa',
    loc: {} as any,
    fnStatementTokens: ['1a', '1b', '1c', '1d'],
    fnStatementTypes: ['t_1a', 't_1b', 't_1c', 't_1d'],
  },
  {
    index: 1,
    type: 'fn',
    name: 'bb',
    loc: {} as any,
    fnStatementTokens: ['2a', '2b', '2c', '2d'],
    fnStatementTypes: ['t_2a', 't_2b', 't_2c', 't_2d'],
  },
  {
    index: 2,
    type: 'fn',
    name: 'cc',
    loc: {} as any,
    fnStatementTokens: ['3a', '3b', '3c', '3d'],
    fnStatementTypes: ['t_3a', 't_3b', 't_3c', 't_3d'],
  },
  {
    index: 3,
    type: 'fn',
    name: '[anonymous]',
    loc: {} as any,
    fnStatementTokens: ['4a', '4b', '4c', '4d', '4d', '4d'],
    fnStatementTypes: ['t_4a', 't_4b', 't_4c', 't_4d', 't_4d', 't_4d'],
  },
  {
    index: 4,
    type: 'fn',
    name: 'eee:>>:[anonymous]',
    loc: {} as any,
    fnStatementTokens: ['5a', '5b', '5c', '5c', '5d', '5d'],
    fnStatementTypes: ['t_5a', 't_5b', 't_5c', 't_5c', 't_5d', 't_5d'],
  },
  {
    index: 5,
    type: 'fn',
    name: 'fff:>>:[anonymous]',
    loc: {} as any,
    fnStatementTokens: ['6a', '6b', '6c', '6d', '6d'],
    fnStatementTypes: ['t_6a', 't_6b', 't_6c', 't_6d', 't_6d'],
  },
]
export const POSSIBLE_NAMES_BY_FN_ST_TOKENS = [
  /* UNKNOWN_SIG[0] */ { name: 'aa', prob: { val: 4 / 4, num: 4, den: 4 } },
  /* UNKNOWN_SIG[1] */ { name: 'bb', prob: { val: 3 / 5, num: 3, den: 5 } },
  /* UNKNOWN_SIG[2] */ { name: 'cc', prob: { val: 4 / 5, num: 4, den: 5 } },
  /* UNKNOWN_SIG[3] */ { name: '[anonymous]', prob: { val: 4 / 6, num: 4, den: 6 } },
  /* UNKNOWN_SIG[4] */ { name: 'fff:>>:[anonymous]', prob: { val: 2 / 7, num: 2, den: 7 } },
  /* UNKNOWN_SIG[5] */ { name: 'eee:>>:[anonymous]', prob: { val: 4 / 9, num: 4, den: 9 } },
]
export const EXPECTED_SIMILARITY = jaccardLike(
  POSSIBLE_NAMES_BY_FN_ST_TOKENS.map((s) => s.name),
  LIB_SIG.map((s) => s.name),
)
export const EXPECTED_MAPPING = new Map([
  [0, { index: 0, prob: { val: 4 / 4, num: 4, den: 4 } }],
  [1, { index: 1, prob: { val: 3 / 5, num: 3, den: 5 } }],
  [2, { index: 2, prob: { val: 4 / 5, num: 4, den: 5 } }],
  [3, { index: 3, prob: { val: 4 / 6, num: 4, den: 6 } }],
  [4, { index: 5, prob: { val: 2 / 7, num: 2, den: 7 } }],
  [5, { index: 4, prob: { val: 4 / 9, num: 4, den: 9 } }],
]) as DefiniteMap<number, probIndex>

export const EXPECTED_SIMILARITY_WITH_MAP_QUALITY = FractionToIndexValue(
  [...EXPECTED_MAPPING.values()]
    .reduce((acc, { prob: { num, den } }) => acc.add(num, den), new Fraction(0))
    .div(EXPECTED_MAPPING.size)
    .mul(EXPECTED_SIMILARITY.num, EXPECTED_SIMILARITY.den),
)

export const EXPECTED_MAPPING_FOR_EXACT_MATCHES = [...EXPECTED_MAPPING]
  .filter(([, { prob: { val } }]) => val === 1)
  .reduce((acc, [k, v]) => acc.set(k, v), new Map() as DefiniteMap<number, probIndex>)
export const EXPECTED_SIMILARITY_FOR_EXACT_MATCHES = jaccardLike(
  UNKNOWN_SIG.map(
    (_, i) =>
      EXPECTED_MAPPING_FOR_EXACT_MATCHES.has(i)
        ? EXPECTED_MAPPING_FOR_EXACT_MATCHES.get(i).index
        : -1,
  ),
  LIB_SIG.map((_, i) => i),
)
