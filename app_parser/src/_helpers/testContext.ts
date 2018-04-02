import * as ava from 'ava'

export function contextualize<T>(getContext: () => T | Promise<T>) {
  ava.test.beforeEach(async (t) => {
    Object.assign(t.context, await getContext())
  })

  return ava.test as ava.TestInterface<T>
}
