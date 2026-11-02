import { describe, expect, it } from 'vitest'
import { isTap } from './tapDetector'

describe('tap detector', () => {
  it('accepts a short tap', () => {
    expect(isTap({ x: 100, y: 100, time: 0 }, { x: 103, y: 102, time: 120 })).toBe(true)
  })

  it('rejects a drag beyond 6 pixels', () => {
    expect(isTap({ x: 100, y: 100, time: 0 }, { x: 108, y: 100, time: 120 })).toBe(false)
  })

  it('rejects a press longer than 500 ms', () => {
    expect(isTap({ x: 100, y: 100, time: 0 }, { x: 100, y: 100, time: 650 })).toBe(false)
  })
})
