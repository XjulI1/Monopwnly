/** Replaces a local storage whose access throws, as when the browser blocks site data, by null, so that code checking for its absence keeps working. */
export function neutralizeBlockedStorage(target: object = globalThis): void {
  try {
    Reflect.get(target, 'localStorage')
  } catch {
    Object.defineProperty(target, 'localStorage', { configurable: true, value: null })
  }
}

neutralizeBlockedStorage()
