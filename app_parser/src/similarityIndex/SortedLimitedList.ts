import { Many, sortedLastIndex, sortedLastIndexBy, ValueIteratee } from 'lodash'

const LIMIT = 100

export interface FilterFn<T> {
  <S extends T>(value: T): value is S
  (value: T): boolean
}
export class SortedLimitedList<T> {
  private _arr: T[] = []
  private _predicate: ValueIteratee<T> | undefined
  private readonly _filter: FilterFn<T> | undefined
  private _limit: number
  private _finished = false

  public constructor({
    predicate = undefined,
    filter = undefined,
    limit = LIMIT,
  }: { predicate?: ValueIteratee<T>; filter?: FilterFn<T>; limit?: number } = {}) {
    this._predicate = predicate
    this._filter = filter
    this._limit = limit
  }

  public push(el: Many<T>) {
    if (this._finished) {
      throw new Error('Cannot push into finished SortedLimitedList')
    }

    if (Array.isArray(el)) {
      el.forEach((el) => this.push(el))
      return this
    }

    if (this._filter && !this._filter(el)) {
      return this
    }

    const i = this._predicate
      ? sortedLastIndexBy(this._arr, el, this._predicate)
      : sortedLastIndex(this._arr, el)

    for (let j = this._arr.length; j > i; j--) {
      this._arr[j] = this._arr[j - 1]
    }
    this._arr[i] = el

    while (this._arr.length > this._limit) {
      this._arr.pop()
    }

    return this
  }

  public value(): T[] {
    if (this._finished) {
      throw new Error('Cannot get value of finished SortedLimitedList')
    }

    const val = this._arr
    this._finished = true
    delete this._arr
    delete this._predicate
    delete this._limit

    return val
  }
}
