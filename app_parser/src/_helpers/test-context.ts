import test, { TestInterface } from 'ava'

export function contextualize<T>(getContext: () => T | Promise<T>) {
  test.beforeEach(async (t) => {
    Object.assign(t.context, await getContext())
  })

  return test as TestInterface<T>
}
