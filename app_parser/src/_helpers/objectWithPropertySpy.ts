import { SinonStub, stub } from 'sinon'

export const objectWithPropertySpy = <T>(
  key: string,
  value: T,
): {
  getSpy: SinonStub
  setSpy: SinonStub
  obj: { prop: T }
} => {
  let valStorage = value

  const getSpy = stub().callsFake(() => {
    return valStorage
  })
  const setSpy = stub().callsFake((newValue: T) => {
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
