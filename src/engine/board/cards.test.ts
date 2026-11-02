import { describe, expect, it } from 'vitest'
import { CARDS, cardById } from './cards'
import { BOARD_SIZE } from './squares'

describe('cards', () => {
  it('has 16 Exploit and 16 Patch cards with distinct identifiers', () => {
    expect(CARDS.filter((c) => c.deck === 'exploit')).toHaveLength(16)
    expect(CARDS.filter((c) => c.deck === 'patch')).toHaveLength(16)
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(32)
  })

  it('has exactly one decryption key per deck', () => {
    for (const deck of ['exploit', 'patch'] as const) {
      expect(CARDS.filter((c) => c.deck === deck && c.effect.kind === 'decryptionKey')).toHaveLength(1)
    }
  })

  it('targets existing squares', () => {
    for (const card of CARDS) {
      if (card.effect.kind === 'moveTo' || card.effect.kind === 'moveBackTo') {
        expect(card.effect.target).toBeGreaterThanOrEqual(0)
        expect(card.effect.target).toBeLessThan(BOARD_SIZE)
      }
    }
  })

  it('has a title and a text for every card and identifiers prefixed by their deck', () => {
    for (const card of CARDS) {
      expect(card.title.length).toBeGreaterThan(0)
      expect(card.text.length).toBeGreaterThan(0)
      expect(card.id.startsWith(`${card.deck}-`)).toBe(true)
      expect(cardById(card.id)).toBe(card)
    }
  })
})
