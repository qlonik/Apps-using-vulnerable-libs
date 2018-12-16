declare module 'typical-mini' {
  export type The<T, V extends T> = V
  export type Omit<T, K> = Pick<T, Exclude<keyof T, K>>
  export type Simplify<T> = Pick<T, keyof T>
}
