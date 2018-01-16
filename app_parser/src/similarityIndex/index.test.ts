import { test } from 'ava'
import { Signature } from '../extractStructure'
import {
  librarySimilarityByFunctionNames,
  librarySimilarityByFunctionStatementTokens,
  librarySimilarityByFunctionStatementTypes,
} from './index'
import { jaccardIndex as jaccardIndexFn, jaccardLike, similarityIndexToLib } from './set'


const UNKNOWN_SIG: Signature[] = [
  {
    type: 'fn',
    name: 'aa',
    fnStatementTokens: ['1a', '1b', '1c', '1d'],
    fnStatementTypes: ['t_1a', 't_1b', 't_1c', 't_1d']
  },
  {
    type: 'fn',
    name: 'bb',
    fnStatementTokens: ['1a', '2b', '2c', '2d'],
    fnStatementTypes: ['t_1a', 't_2b', 't_2c', 't_2d']
  },
  {
    type: 'fn',
    name: 'cc',
    fnStatementTokens: ['3a', '3b', '3c', '3d', '3d'],
    fnStatementTypes: ['t_3a', 't_3b', 't_3c', 't_3d', 't_3d']
  },
  {
    type: 'fn',
    name: '[anonymous]',
    fnStatementTokens: ['4a', '4b', '4d', '4d'],
    fnStatementTypes: ['t_4a', 't_4b', 't_4d', 't_4d']
  },
  {
    type: 'fn',
    name: 'ee',
    fnStatementTokens: ['5a', '5b', '6a', '6b'],
    fnStatementTypes: ['t_5a', 't_5b', 't_6a', 't_6b']
  },
  {
    type: 'fn',
    name: 'ff',
    fnStatementTokens: ['5a', '5c', '5d', '5d', '6c', '6d', '6d'],
    fnStatementTypes: ['t_5a', 't_5c', 't_5d', 't_5d', 't_6c', 't_6d', 't_6d']
  },
]
const LIB_SIG: Signature[] = [
  {
    type: 'fn',
    name: 'aa',
    fnStatementTokens: ['1a', '1b', '1c', '1d'],
    fnStatementTypes: ['t_1a', 't_1b', 't_1c', 't_1d']
  },
  {
    type: 'fn',
    name: 'bb',
    fnStatementTokens: ['2a', '2b', '2c', '2d'],
    fnStatementTypes: ['t_2a', 't_2b', 't_2c', 't_2d']
  },
  {
    type: 'fn',
    name: 'cc',
    fnStatementTokens: ['3a', '3b', '3c', '3d'],
    fnStatementTypes: ['t_3a', 't_3b', 't_3c', 't_3d']
  },
  {
    type: 'fn',
    name: '[anonymous]',
    fnStatementTokens: ['4a', '4b', '4c', '4d', '4d', '4d'],
    fnStatementTypes: ['t_4a', 't_4b', 't_4c', 't_4d', 't_4d', 't_4d']
  },
  {
    type: 'fn',
    name: 'eee',
    fnStatementTokens: ['5a', '5b', '5c', '5c', '5d', '5d'],
    fnStatementTypes: ['t_5a', 't_5b', 't_5c', 't_5c', 't_5d', 't_5d']
  },
  {
    type: 'fn',
    name: 'fff',
    fnStatementTokens: ['6a', '6b', '6c', '6d', '6d'],
    fnStatementTypes: ['t_6a', 't_6b', 't_6c', 't_6d', 't_6d']
  },
]
const POSSIBLE_NAMES_BY_FN_ST_TOKENS = [
  /* UNKNOWN_SIG[0] */ { name: 'aa', prob: { val: 4 / 4, num: 4, den: 4 } },
  /* UNKNOWN_SIG[1] */ { name: 'bb', prob: { val: 3 / 5, num: 3, den: 5 } },
  /* UNKNOWN_SIG[2] */ { name: 'cc', prob: { val: 4 / 5, num: 4, den: 5 } },
  /* UNKNOWN_SIG[3] */ { name: '[anonymous]', prob: { val: 4 / 6, num: 4, den: 6 } },
  /* UNKNOWN_SIG[4] */ { name: 'fff', prob: { val: 2 / 7, num: 2, den: 7 } },
  /* UNKNOWN_SIG[5] */ { name: 'eee', prob: { val: 4 / 9, num: 4, den: 9 } },
]

test('librarySimilarityByFunctionNames', t => {
  const unknownNameSet = new Set(UNKNOWN_SIG.map(s => s.name))
  const libNameSet = new Set(LIB_SIG.map(s => s.name))
  const expected = {
    ourIndex: similarityIndexToLib(libNameSet, unknownNameSet),
    jaccardIndex: jaccardIndexFn(libNameSet, unknownNameSet),
  }
  const result = librarySimilarityByFunctionNames({ unknown: UNKNOWN_SIG, lib: LIB_SIG })
  t.deepEqual(expected, result)
})

test('librarySimilarityByFunctionStatementTokens', t => {
  const expected = jaccardLike(
    POSSIBLE_NAMES_BY_FN_ST_TOKENS.map(s => s.name),
    LIB_SIG.map(s => s.name),
  )
  const result = librarySimilarityByFunctionStatementTokens({
    unknown: UNKNOWN_SIG,
    lib: LIB_SIG,
  })
  t.deepEqual(expected, result)
})

test('librarySimilarityByFunctionStatementTypes', t => {
  const expected = jaccardLike(
    POSSIBLE_NAMES_BY_FN_ST_TOKENS.map(s => s.name),
    LIB_SIG.map(s => s.name),
  )
  const result = librarySimilarityByFunctionStatementTypes({
    unknown: UNKNOWN_SIG,
    lib: LIB_SIG,
  })
  t.deepEqual(expected, result)
})
