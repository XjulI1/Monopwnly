import { describe, expect, it, vi } from 'vitest'
import { createUpdateState, type RegisterOptions } from './updateState'

function fakeRegistration() {
  let options: RegisterOptions = {}
  const updateSW = vi.fn<(reloadPage?: boolean) => Promise<void>>(async () => {})
  const register = vi.fn((given: RegisterOptions) => {
    options = given
    return updateSW
  })
  return { register, updateSW, options: () => options }
}

describe('createUpdateState', () => {
  it('starts with no update ready and registers the service worker once', () => {
    const fake = fakeRegistration()
    const { updateReady } = createUpdateState(fake.register)
    expect(updateReady.value).toBe(false)
    expect(fake.register).toHaveBeenCalledOnce()
  })

  it('becomes ready when a new version is waiting', () => {
    const fake = fakeRegistration()
    const { updateReady } = createUpdateState(fake.register)
    fake.options().onNeedRefresh?.()
    expect(updateReady.value).toBe(true)
  })

  it('stays unchanged when the app is only ready offline or the registration fails', () => {
    const fake = fakeRegistration()
    const { updateReady } = createUpdateState(fake.register)
    fake.options().onOfflineReady?.()
    fake.options().onRegisterError?.(new Error('blocked'))
    expect(updateReady.value).toBe(false)
  })

  it('activates the waiting version and reloads the page on apply', async () => {
    const fake = fakeRegistration()
    const { applyUpdate } = createUpdateState(fake.register)
    fake.options().onNeedRefresh?.()
    await applyUpdate()
    expect(fake.updateSW).toHaveBeenCalledExactlyOnceWith(true)
  })

  it('never becomes ready without a registration (development, or no service worker support)', async () => {
    const { updateReady, applyUpdate } = createUpdateState()
    expect(updateReady.value).toBe(false)
    await expect(applyUpdate()).resolves.toBeUndefined()
    expect(updateReady.value).toBe(false)
  })
})
