import { objectWithPropertySpy } from '../_helpers/objectWithPropertySpy'
import { contextualize } from '../_helpers/testContext'
import { Signal, Signals, visitNodes } from './index'


const test = contextualize(() => {
  const value = 42
  const { getSpy, setSpy, propName, obj } = objectWithPropertySpy(value)

  const tree = {
    a: {
      b: {
        c: true,
        d: false,
        e: 123,
        f: 234,
      },
      g: [
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
    prop: propName,
    tree,
  }
})


test('empty options', t => {
  const { tree, getSpy, setSpy } = t.context

  const iterator = visitNodes()
  const result = iterator(tree)

  t.true(getSpy.notCalled)
  t.true(setSpy.notCalled)
  t.deepEqual([], result)
})

test('include nodes', t => {
  const { tree, getSpy, setSpy } = t.context

  const iterator = visitNodes({ includeNodes: true })
  const result = iterator(tree)

  t.true(getSpy.notCalled)
  t.true(setSpy.notCalled)
  t.deepEqual([], result)
})

test('filter returns null', t => {
  const { tree, getSpy, setSpy } = t.context

  const iterator = visitNodes({
    fn: () => new Signal<any>(Signals.continueRecursion, null),
  })
  const result = iterator(tree)

  t.true(getSpy.calledOnce)
  t.true(setSpy.notCalled)
  t.deepEqual([], result)
})

test('filter returns null and include nodes', t => {
  const { tree, getSpy, setSpy } = t.context

  const iterator = visitNodes({
    fn: () => new Signal<any>(Signals.continueRecursion, null),
    includeNodes: true,
  })
  const result = iterator(tree)

  t.true(getSpy.calledOnce)
  t.true(setSpy.notCalled)
  t.deepEqual([], result)
})

test('filter returns some data and continues recursion', t => {
  const { tree, getSpy, setSpy } = t.context

  const iterator = visitNodes({
    fn: (path, val) => {
      if (path === 'a.g' || path === 'a.g[1].i' || path === 'o') {
        return new Signal(Signals.continueRecursion, {
          path,
          data: val,
        })
      }

      return new Signal<any>(Signals.continueRecursion, null)
    },
  })
  const result = iterator(tree)

  t.true(getSpy.calledOnce)
  t.true(setSpy.notCalled)
  t.deepEqual([{
    prop: 'a.g',
    data: { path: 'a.g', data: tree.a.g },
    c: [{
      prop: 'a.g[1].i',
      data: { path: 'a.g[1].i', data: tree.a.g[1].i },
    }],
  }, {
    prop: 'o',
    data: { path: 'o', data: tree.o },
  }], result)
})

test('filter returns some data and prevents recursion', t => {
  const { tree, getSpy, setSpy } = t.context

  const iterator = visitNodes({
    fn: (path, val) => {
      if (path === 'a.g' || path === 'a.g[1].i' || path === 'o') {
        return new Signal(Signals.preventRecursion, {
          path,
          data: val,
        })
      }

      return new Signal<any>(Signals.continueRecursion, null)
    },
  })
  const result = iterator(tree)

  t.true(getSpy.notCalled)
  t.true(setSpy.notCalled)
  t.deepEqual([{
    prop: 'a.g',
    data: { path: 'a.g', data: tree.a.g },
  }, {
    prop: 'o',
    data: { path: 'o', data: tree.o },
  }], result)
})

test('filter returns spied object', t => {
  const { tree, getSpy, setSpy, prop, value } = t.context

  const iterator = visitNodes({
    fn: (path, val) => {
      if (path === `o.p.${prop}`) {
        return new Signal(Signals.preventRecursion, {
          path,
          data: val,
        })
      }

      return new Signal<any>(Signals.continueRecursion, null)
    },
  })
  const result = iterator(tree)

  t.true(getSpy.calledOnce)
  t.true(setSpy.notCalled)
  t.deepEqual([{
    prop: `o.p.${prop}`,
    data: { path: `o.p.${prop}`, data: value },
  }], result)
})

