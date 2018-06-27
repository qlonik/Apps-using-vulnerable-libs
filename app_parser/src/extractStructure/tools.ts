import { SourceLocation } from 'babel-types' // eslint-disable-line no-unused-vars
import { Fraction } from 'fraction.js'
import { last } from 'lodash/fp'
import { fnNamesSplit, FunctionSignature, FunctionSignatures } from './index'

export const LONG_LINE_LENGTH = 130
const LONG_FN_NAME_LENGTH = 4
const ANONYMOUS_FN_NAME = '[anonymous]'
export const LOTS_OF_SHORT_AND_ANONYMOUS_FUNCTIONS = 0.9
export const MOST_CONTENT_IN_LONG_LINES = 0.9

export const averageLineLength = (src: string): number => {
  const lines = src.split('\n').map((s) => s.length)
  const totalLinesLength = lines.reduce((a, l) => a + l, 0)
  return Math.floor(totalLinesLength / lines.length)
}

export const contentInLongLinesRatio = (src: string): number => {
  const lines = src.split('\n').map((s) => s.length)
  return lines
    .reduce((a, l) => a.add(new Fraction(l).pow(2)).div(src.length), new Fraction(0))
    .div(lines.length)
    .valueOf()
}

export const isSrcMinified = (src: string): boolean => {
  return (
    averageLineLength(src) > LONG_LINE_LENGTH ||
    contentInLongLinesRatio(src) > MOST_CONTENT_IN_LONG_LINES
  )
}

const shortOrAnonymousFnRatio = (sig: FunctionSignature[] | FunctionSignatures): number => {
  const _sig = Array.isArray(sig) ? sig : sig.functionSignature
  const fnNamesCount = _sig
    .map(({ name }) => last(fnNamesSplit(name)))
    .filter((i): i is NonNullable<typeof i> => i !== null && i !== undefined)
    .reduce(
      (acc, name) => ({
        sh: acc.sh + (name !== ANONYMOUS_FN_NAME && name.length < LONG_FN_NAME_LENGTH ? 1 : 0),
        an: acc.an + (name === ANONYMOUS_FN_NAME ? 1 : 0),
      }),
      { sh: 0, an: 0 },
    )

  return (fnNamesCount.sh + fnNamesCount.an) / _sig.length
}

export const isSigMinified = (sig: FunctionSignature[] | FunctionSignatures): boolean => {
  return shortOrAnonymousFnRatio(sig) > LOTS_OF_SHORT_AND_ANONYMOUS_FUNCTIONS
}
