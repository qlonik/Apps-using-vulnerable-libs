import * as ava from 'ava'

export function contextualize<T>(getContext: () => T): ava.RegisterContextual<T> {
  ava.test.beforeEach(t => {
    Object.assign(t.context, getContext())
  })

  return ava.test
}
