type arg0 = number | string | { n: number; d: number } | [number, number]
type arg1 = number

export declare class Fraction {
  public static REDUCE: boolean

  public readonly s: -1 | 1
  public readonly n: number
  public readonly d: number

  public constructor(a: arg0, b?: arg1)
  public abs(): Fraction
  public neg(): Fraction
  public add(a: arg0, b?: arg1): Fraction
  public sub(a: arg0, b?: arg1): Fraction
  public mul(a: arg0, b?: arg1): Fraction
  public div(a: arg0, b?: arg1): Fraction
  public clone(): Fraction
  public mod(a: arg0, b?: arg1): Fraction
  public gcd(a: arg0, b?: arg1): Fraction
  public lcm(a: arg0, b?: arg1): Fraction
  public ceil(a?: number): Fraction
  public floor(a?: number): Fraction
  public round(a?: number): Fraction
  public inverse(): Fraction
  public pow(a: number): Fraction
  public equals(a: arg0, b?: arg1): Fraction
  public compare(a: arg0, b?: arg1): number
  public simplify(epsilon?: number): Fraction
  public divisible(a: arg0, b?: arg1): Fraction
  public valueOf(): number
  public toFraction(): string
  public toLatex(): string
  public toContinued(): number[]
  public toString(): string
}
