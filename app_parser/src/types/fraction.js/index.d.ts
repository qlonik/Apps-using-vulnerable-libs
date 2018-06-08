type arg0 = number | string | { n: number; d: number } | [number, number]
type arg1 = number

export declare class Fraction {
  static REDUCE: boolean

  public readonly s: -1 | 1
  public readonly n: number
  public readonly d: number

  constructor(a: arg0, b?: arg1)
  abs(): Fraction
  neg(): Fraction
  add(a: arg0, b?: arg1): Fraction
  sub(a: arg0, b?: arg1): Fraction
  mul(a: arg0, b?: arg1): Fraction
  div(a: arg0, b?: arg1): Fraction
  clone(): Fraction
  mod(a: arg0, b?: arg1): Fraction
  gcd(a: arg0, b?: arg1): Fraction
  lcm(a: arg0, b?: arg1): Fraction
  ceil(a?: number): Fraction
  floor(a?: number): Fraction
  round(a?: number): Fraction
  inverse(): Fraction
  pow(a: number): Fraction
  equals(a: arg0, b?: arg1): Fraction
  compare(a: arg0, b?: arg1): number
  simplify(epsilon?: number): Fraction
  divisible(a: arg0, b?: arg1): Fraction
  valueOf(): number
  toFraction(): string
  toLatex(): string
  toContinued(): number[]
  toString(): string
}
