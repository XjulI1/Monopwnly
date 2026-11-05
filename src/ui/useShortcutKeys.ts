import { onBeforeUnmount, onMounted } from 'vue'
import { shortcutOfKey } from '../game/shortcuts'

const TEXT_ENTRY =
  'textarea, select, [contenteditable]:not([contenteditable="false"]), input:not([type="button"], [type="checkbox"], [type="radio"], [type="range"], [type="color"], [type="submit"], [type="reset"], [type="file"], [type="image"])'
const ALERT = '[role="alertdialog"]'
const ACTIVATION_KEYS: ReadonlySet<string> = new Set(['Enter', 'Space'])

let navigatingByKeyboard = false

function hasModifier(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.metaKey || event.altKey
}

function ignored(event: KeyboardEvent): boolean {
  if (event.defaultPrevented || event.repeat || event.isComposing || hasModifier(event)) return true
  const target = event.target instanceof Element ? event.target : null
  return target?.closest(TEXT_ENTRY) != null || document.querySelector(ALERT) !== null
}

function focusedControl(event: KeyboardEvent): HTMLElement | null {
  const target = event.target
  return target instanceof HTMLElement && target !== document.body ? target : null
}

/**
 * Calls `handle` with the shortcut of each key pressed while the component is mounted, except in a text field,
 * under an alert dialog, or when Enter or Space activates a control reached with Tab. A handled key loses its
 * default action, and a control the pointer left focused gives Enter and Space up to the shortcut.
 */
export function useShortcutKeys(handle: (shortcut: string) => boolean): void {
  const trackPointer = () => {
    navigatingByKeyboard = false
  }
  const trackTab = (event: KeyboardEvent) => {
    if (event.key === 'Tab') navigatingByKeyboard = true
  }
  const onKeydown = (event: KeyboardEvent) => {
    if (ignored(event)) return
    const shortcut = shortcutOfKey(event.key)
    const control = ACTIVATION_KEYS.has(shortcut) ? focusedControl(event) : null
    if (control && navigatingByKeyboard) return
    if (!handle(shortcut)) return
    event.preventDefault()
    control?.blur()
  }

  onMounted(() => {
    window.addEventListener('pointerdown', trackPointer, true)
    window.addEventListener('keydown', trackTab, true)
    window.addEventListener('keydown', onKeydown)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('pointerdown', trackPointer, true)
    window.removeEventListener('keydown', trackTab, true)
    window.removeEventListener('keydown', onKeydown)
  })
}
