import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { useShortcutKeys } from './useShortcutKeys'

const HANDLED = new Set(['G', 'Enter', 'Space', 'Escape'])

function host() {
  const handle = vi.fn((shortcut: string) => HANDLED.has(shortcut))
  const Host = defineComponent({
    setup() {
      useShortcutKeys(handle)
      return () => h('div', [h('button', { type: 'button', 'data-test': 'control' }, 'Contrôle'), h('input', { type: 'number' })])
    },
  })
  const wrapper = mount(Host, { attachTo: document.body })
  point(window)
  const control = wrapper.get('[data-test="control"]').element as HTMLButtonElement
  const input = wrapper.get('input').element as HTMLInputElement
  return { wrapper, handle, control, input }
}

function press(key: string, target: EventTarget = document.body, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(event)
  return event
}

function point(target: EventTarget) {
  target.dispatchEvent(new Event('pointerdown', { bubbles: true }))
}

enableAutoUnmount(afterEach)

afterEach(() => {
  document.body.innerHTML = ''
})

describe('useShortcutKeys', () => {
  it('hands the shortcut of the key to the handler and cancels the default action of a handled key', () => {
    const { handle } = host()
    expect(press('g').defaultPrevented).toBe(true)
    expect(press(' ').defaultPrevented).toBe(true)
    expect(handle.mock.calls).toEqual([['G'], ['Space']])
  })

  it('keeps the default action of a key the handler leaves', () => {
    const { handle } = host()
    expect(press('x').defaultPrevented).toBe(false)
    expect(handle).toHaveBeenCalledWith('X')
  })

  it('ignores the keys typed in a text field', () => {
    const { handle, input } = host()
    input.focus()
    press('g', input)
    press('Enter', input)
    expect(handle).not.toHaveBeenCalled()
  })

  it('ignores the keys combined with a modifier, held down or already handled', () => {
    const { handle } = host()
    press('g', document.body, { ctrlKey: true })
    press('g', document.body, { metaKey: true })
    press('g', document.body, { altKey: true })
    press('g', document.body, { repeat: true })
    const handled = new KeyboardEvent('keydown', { key: 'g', bubbles: true, cancelable: true })
    handled.preventDefault()
    document.body.dispatchEvent(handled)
    expect(handle).not.toHaveBeenCalled()
  })

  it('leaves Enter and Space to a control reached with Tab', () => {
    const { handle, control } = host()
    press('Tab')
    control.focus()
    expect(press('Enter', control).defaultPrevented).toBe(false)
    expect(press(' ', control).defaultPrevented).toBe(false)
    expect(handle.mock.calls).toEqual([['Tab']])
    press('g', control)
    expect(handle).toHaveBeenCalledWith('G')
  })

  it('takes Enter from a control the pointer left focused, and moves the focus away from it', () => {
    const { handle, control } = host()
    point(control)
    control.focus()
    expect(press('Enter', control).defaultPrevented).toBe(true)
    expect(handle).toHaveBeenCalledWith('Enter')
    expect(document.activeElement).not.toBe(control)
  })

  it('leaves the keys to an alert dialog', () => {
    const { handle } = host()
    const alert = document.createElement('div')
    alert.setAttribute('role', 'alertdialog')
    document.body.append(alert)
    press('Escape')
    expect(handle).not.toHaveBeenCalled()
  })

  it('stops listening once the component is unmounted', () => {
    const { handle, wrapper } = host()
    wrapper.unmount()
    press('g')
    expect(handle).not.toHaveBeenCalled()
  })
})
