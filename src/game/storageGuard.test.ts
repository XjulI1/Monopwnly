import { describe, expect, it } from 'vitest'
import { neutralizeBlockedStorage } from './storageGuard'

describe('neutralizeBlockedStorage', () => {
  it('replaces a local storage that throws on access by null', () => {
    const target = {}
    Object.defineProperty(target, 'localStorage', {
      configurable: true,
      get: () => {
        throw new DOMException('The operation is insecure.', 'SecurityError')
      },
    })
    neutralizeBlockedStorage(target)
    expect(Reflect.get(target, 'localStorage')).toBeNull()
  })

  it('leaves a working local storage alone', () => {
    const storage = { getItem: () => null }
    const target = { localStorage: storage }
    neutralizeBlockedStorage(target)
    expect(target.localStorage).toBe(storage)
  })
})
