import { test } from 'ava'
import { cloneDeep } from 'lodash'
import { jaccardIndex as jaccardIndexFn, similarityIndexToLib } from '../set'
import { LIB_SIG, UNKNOWN_SIG } from './_test-data'
import { librarySimilarityByFunctionNames } from './fn-names'

test('librarySimilarityByFunctionNames', t => {
  const unknownNameSet = new Set(UNKNOWN_SIG.map(s => s.name))
  const libNameSet = new Set(LIB_SIG.map(s => s.name))
  const expected = {
    ourIndex: similarityIndexToLib(libNameSet, unknownNameSet),
    jaccardIndex: jaccardIndexFn(libNameSet, unknownNameSet),
  }
  const unknown = { functionSignature: cloneDeep(UNKNOWN_SIG), literalSignature: [] }
  const lib = { functionSignature: cloneDeep(LIB_SIG), literalSignature: [] }
  const result = librarySimilarityByFunctionNames({ unknown, lib })
  t.deepEqual(expected, result)
})
