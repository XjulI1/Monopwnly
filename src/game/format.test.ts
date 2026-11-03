import { describe, expect, it } from 'vitest'
import { formatPwn, formatPwnDelta, formatSavedAt, phaseName } from './format'

const THIN_NBSP = '\u202F'
const NBSP = '\u00A0'

describe('formatPwn', () => {
  it('groups thousands with a narrow no-break space and puts a no-break space before the symbol', () => {
    expect(formatPwn(1500)).toBe(`1${THIN_NBSP}500${NBSP}Ᵽ`)
  })

  it('formats zero and small amounts', () => {
    expect(formatPwn(0)).toBe(`0${NBSP}Ᵽ`)
    expect(formatPwn(25)).toBe(`25${NBSP}Ᵽ`)
  })

  it('formats millions', () => {
    expect(formatPwn(1234567)).toBe(`1${THIN_NBSP}234${THIN_NBSP}567${NBSP}Ᵽ`)
  })

  it('keeps the sign of a negative amount', () => {
    expect(formatPwn(-50)).toBe(`-50${NBSP}Ᵽ`)
  })
})

describe('formatPwnDelta', () => {
  it('signs gains and losses', () => {
    expect(formatPwnDelta(200)).toBe(`+200${NBSP}Ᵽ`)
    expect(formatPwnDelta(-1500)).toBe(`-1${THIN_NBSP}500${NBSP}Ᵽ`)
  })

  it('leaves zero unsigned', () => {
    expect(formatPwnDelta(0)).toBe(`0${NBSP}Ᵽ`)
  })
})

describe('phaseName', () => {
  it('names the five engine phases in French', () => {
    expect(phaseName('preRoll')).toBe('Avant le lancer')
    expect(phaseName('buyDecision')).toBe('Décision d’achat')
    expect(phaseName('auction')).toBe('Enchère')
    expect(phaseName('debt')).toBe('Règlement de dette')
    expect(phaseName('postRoll')).toBe('Après le lancer')
  })

  it('names the end of the game', () => {
    expect(phaseName('gameOver')).toBe('Partie terminée')
  })
})

describe('formatSavedAt', () => {
  it('writes the date in full and the time of a save', () => {
    expect(formatSavedAt('2026-11-03T12:00:00.000Z')).toMatch(/^3 novembre 2026 à \d{2}:\d{2}$/)
  })
})
