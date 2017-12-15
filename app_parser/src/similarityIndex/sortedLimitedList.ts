import { Many, sortedLastIndex, sortedLastIndexBy, ValueIteratee } from 'lodash'


const LIMIT = 100

export class SortedLimitedList<T> {
  private arr: T[] = []
  private predicate: ValueIteratee<T> | null = null
  private limit = LIMIT
  private finished = false

  constructor({ predicate, limit }: { predicate?: ValueIteratee<T>, limit?: number }) {
    if (predicate) {
      this.predicate = predicate
    }
    if (limit) {
      this.limit = limit
    }
  }

  push(el: Many<T>) {
    if (this.finished) {
      throw new Error('Cannot push into finished SortedLimitedList')
    }

    if (Array.isArray(el)) {
      el.forEach((el) => this.push(el))
      return this
    }

    const i = this.predicate
      ? sortedLastIndexBy(this.arr, el, this.predicate)
      : sortedLastIndex(this.arr, el)

    for (let j = this.arr.length; j > i; j--) {
      this.arr[j] = this.arr[j - 1]
    }
    this.arr[i] = el

    while (this.arr.length > this.limit) {
      this.arr.pop()
    }

    return this
  }

  value(): T[] {
    if (this.finished) {
      throw new Error('Cannot get value of finished SortedLimitedList')
    }

    const val = this.arr
    this.finished = true
    delete this.arr
    delete this.predicate
    delete this.limit

    return val
  }
}
