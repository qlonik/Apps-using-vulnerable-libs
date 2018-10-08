import * as ava from 'ava'

export function contextualize<T>(getContext: () => T | Promise<T>) {
  ava.default.beforeEach(async (t) => {
    Object.assign(t.context, await getContext())
  })

  return ava.default as ava.TestInterface<T>
}
