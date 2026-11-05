import { describe, expect, it } from 'vitest'
import { smallestAcceptedStep } from './stepSearch'

describe('smallestAcceptedStep', () => {
  it('finds the first accepted step', () => {
    expect(smallestAcceptedStep((steps) => steps >= 7, 20)).toBe(7)
    expect(smallestAcceptedStep((steps) => steps >= 0, 20)).toBe(0)
    expect(smallestAcceptedStep((steps) => steps >= 20, 20)).toBe(20)
  })

  it('gives null when even the last step is refused, or when there is no step at all', () => {
    expect(smallestAcceptedStep((steps) => steps >= 21, 20)).toBeNull()
    expect(smallestAcceptedStep((steps) => steps >= 1, -3)).toBeNull()
  })
})
