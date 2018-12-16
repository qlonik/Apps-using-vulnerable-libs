declare module 'typical-mini' {
  type The<T, V extends T> = V
  type Omit<T, K> = Pick<T, Exclude<keyof T, K>>
  type Simplify<T> = Pick<T, keyof T>
}
