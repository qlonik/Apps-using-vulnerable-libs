import { Readable } from 'stream'

interface CloneableFn {
  <T extends Readable>(x: T): T & { clone(): T }
  isCloneable(x: Readable): boolean
}
declare var cloneable: CloneableFn
export = cloneable
