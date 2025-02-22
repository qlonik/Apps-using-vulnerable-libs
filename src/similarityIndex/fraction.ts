import { Fraction } from 'fraction.js'
import { divByZeroIsOne, indexValue } from './set'

export const IndexValueToFraction = ({ num, den }: indexValue) => {
  return den === 0 ? new Fraction(divByZeroIsOne(num, den)) : new Fraction(num, den)
}
export const FractionToIndexValue = (f: Fraction) => {
  return { val: f.valueOf(), num: f.s * f.n, den: f.d }
}
