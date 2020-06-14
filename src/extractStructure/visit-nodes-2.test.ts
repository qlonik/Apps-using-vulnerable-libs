import { restore, SinonStub, stub } from 'sinon'
import t from 'tap'
import { getDefaultOpts } from './options'
import { Signal, visitNodes } from './visit-nodes'

const objectWithPropertySpy = <K extends string, V>(
  key: K,
  value: V,
): {
  getSpy: SinonStub
  setSpy: SinonStub
  obj: { [S in K]: V }
} => {
  let valStorage = value

  const getSpy = stub().callsFake(() => {
    return valStorage
  })
  const setSpy = stub().callsFake((newValue: V) => {
    valStorage = newValue
  })
  const obj = Object.defineProperty({}, key, {
    configurable: true,
    enumerable: true,
    set: setSpy,
    get: getSpy,
  })

  return {
    getSpy,
    setSpy,
    obj,
  }
}

const setup = () => {
  const prop = 'prop'
  const value = 42
  const { getSpy, setSpy, obj } = objectWithPropertySpy(prop, value)

  const tree = {
    a: {
      b: {
        c: true,
        d: false,
        e: 123,
        f: 234,
      },
      g: [
        // prettier-ignore
        { h: 1, i: 2, j: 3 },
        { h: 2, i: 3, j: 4 },
        { h: 3, i: 4, j: 5 },
      ],
      k: [1, 2, 3, 4, 5, 6],
      l: {
        1: ['a', 'b', 'c'],
        2: ['b', 'c', 'a'],
        3: ['c', 'a', 'b'],
      },
    },
    m: {
      n: 'hello',
    },
    o: {
      p: obj,
    },
  }

  return {
    getSpy,
    setSpy,
    value,
    prop,
    tree,
  }
}

t.afterEach(async () => {
  restore()
})


t.test('empty options', async t => {
  const { tree, getSpy, setSpy } = setup()

  const iterator = visitNodes()
  const result = iterator(tree, getDefaultOpts())

  t.true(getSpy.notCalled)
  t.true(setSpy.notCalled)
  t.deepEqual([], result)
})

t.test('filter returns null', async t => {
  const { tree, getSpy, setSpy } = setup()

  const iterator = visitNodes(() => Signal.continue<any>(null))
  const result = iterator(tree, getDefaultOpts())

  t.true(getSpy.calledOnce)
  t.true(setSpy.notCalled)
  t.deepEqual([], result)
  t.done()
})

t.test('filter returns some data and continues recursion', async t => {
  const { tree, getSpy, setSpy } = setup()

  const iterator = visitNodes((path, val) => {
    if (path === 'a.g' || path === 'a.g[1].i' || path === 'o') {
      return Signal.continue({
        path,
        data: val,
      })
    }

    return Signal.continue<any>(null)
  })
  const result = iterator(tree, getDefaultOpts())

  t.true(getSpy.calledOnce)
  t.true(setSpy.notCalled)
  t.deepEqual(
    [
      {
        prop: 'a.g',
        data: { path: 'a.g', data: tree.a.g },
        c: [
          {
            prop: 'a.g[1].i',
            data: { path: 'a.g[1].i', data: tree.a.g[1].i },
          },
        ],
      },
      {
        prop: 'o',
        data: { path: 'o', data: tree.o },
      },
    ],
    result,
  )
})

t.test('filter returns some data and prevents recursion', async t => {
  const { tree, getSpy, setSpy } = setup()

  const iterator = visitNodes((path, val) => {
    if (path === 'a.g' || path === 'a.g[1].i' || path === 'o') {
      return Signal.stop({
        path,
        data: val,
      })
    }

    return Signal.continue<any>(null)
  })
  const result = iterator(tree, getDefaultOpts())

  t.true(getSpy.notCalled)
  t.true(setSpy.notCalled)
  t.deepEqual(
    [
      {
        prop: 'a.g',
        data: { path: 'a.g', data: tree.a.g },
      },
      {
        prop: 'o',
        data: { path: 'o', data: tree.o },
      },
    ],
    result,
  )
})

t.test('filter returns spied object', async t => {
  const { tree, getSpy, setSpy, prop, value } = setup()

  const iterator = visitNodes((path, val) => {
    if (path === `o.p.${prop}`) {
      return Signal.stop({
        path,
        data: val,
      })
    }

    return Signal.continue<any>(null)
  })
  const result = iterator(tree, getDefaultOpts())

  t.true(getSpy.calledOnce)
  t.true(setSpy.notCalled)
  t.deepEqual(
    [
      {
        prop: `o.p.${prop}`,
        data: { path: `o.p.${prop}`, data: value },
      },
    ],
    result,
  )
})
