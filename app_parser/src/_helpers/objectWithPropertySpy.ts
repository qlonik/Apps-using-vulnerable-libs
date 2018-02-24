import { SinonStub, stub } from 'sinon'

export const objectWithPropertySpy = <T>(
  value: T,
): {
  getSpy: SinonStub
  setSpy: SinonStub
  propName: 'prop'
  obj: { prop: T }
} => {
  let valStorage = value

  const getSpy = stub().callsFake(() => {
    return valStorage
  })
  const setSpy = stub().callsFake((newValue: T) => {
    valStorage = newValue
  })
  const obj = Object.defineProperty({}, 'prop', {
    configurable: true,
    enumerable: true,
    set: setSpy,
    get: getSpy,
  })

  return {
    getSpy,
    setSpy,
    propName: 'prop',
    obj,
  }
}
