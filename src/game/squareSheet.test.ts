import { describe, expect, it } from 'vitest'
import { A, B, makeState } from '../engine/testUtils'
import { squareSheet } from './squareSheet'

describe('square sheet', () => {
  it('lists the rents of a system and highlights its current level', () => {
    const state = makeState({
      ownership: { 'network-printer': { owner: A, level: 2 }, 'work-mail': { owner: A, level: 2 }, intranet: { owner: A, level: 2 } },
    })
    const sheet = squareSheet(state, 'intranet')
    expect(sheet).toMatchObject({
      kind: 'system',
      name: 'Intranet',
      family: 'office',
      familyName: 'Bureautique',
      price: 160,
      backdoorCost: 100,
      mortgageValue: 80,
      unmortgageCost: 88,
      owner: A,
      mortgaged: false,
      level: 2,
    })
    expect(sheet.kind === 'system' && sheet.rents).toEqual([
      { label: 'Loyer de base', amount: 11, current: false },
      { label: 'Famille complète', amount: 22, current: false },
      { label: '1 backdoor', amount: 55, current: false },
      { label: '2 backdoors', amount: 155, current: true },
      { label: '3 backdoors', amount: 420, current: false },
      { label: '4 backdoors', amount: 550, current: false },
      { label: 'Rootkit', amount: 680, current: false },
    ])
  })

  it('highlights the complete family without buildings', () => {
    const state = makeState({ ownership: { minitel: { owner: B }, 'modem-56k': { owner: B } } })
    const sheet = squareSheet(state, 'minitel')
    expect(sheet.kind === 'system' && sheet.rents.find((r) => r.current)?.label).toBe('Famille complète')
  })

  it('highlights nothing on a free or mortgaged square', () => {
    const state = makeState({ ownership: { blog: { owner: A, mortgaged: true } } })
    for (const id of ['blog', 'forum']) {
      const sheet = squareSheet(state, id)
      expect(sheet.kind === 'system' && sheet.rents.some((r) => r.current)).toBe(false)
    }
    expect(squareSheet(state, 'forum')).toMatchObject({ owner: null, mortgaged: false })
  })

  it('gives the rents of a node by number of nodes owned', () => {
    const state = makeState({ ownership: { 'tor-node': { owner: A }, 'vpn-node': { owner: A } } })
    const sheet = squareSheet(state, 'tor-node')
    expect(sheet.kind).toBe('node')
    expect(sheet.kind === 'node' && sheet.rents).toEqual([
      { label: '1 nœud', amount: 25, current: false },
      { label: '2 nœuds', amount: 50, current: true },
      { label: '3 nœuds', amount: 100, current: false },
      { label: '4 nœuds', amount: 200, current: false },
    ])
  })

  it('gives the dice multipliers of a service', () => {
    const sheet = squareSheet(makeState({ ownership: { cloud: { owner: A } } }), 'cloud')
    expect(sheet.kind === 'service' && sheet.multipliers).toEqual([
      { label: '1 service', amount: 4, current: true },
      { label: '2 services', amount: 10, current: false },
    ])
  })

  it('gives the name and the effect of a square that cannot be bought', () => {
    const state = makeState()
    expect(squareSheet(state, 'boot')).toEqual({ kind: 'other', name: 'Boot', effect: 'Encaissez 200\u00A0Ᵽ à chaque passage.' })
    expect(squareSheet(state, 'ransomware')).toEqual({ kind: 'other', name: 'Rançongiciel', effect: 'Payez 200\u00A0Ᵽ à la banque.' })
    expect(squareSheet(state, 'exploit-2')).toEqual({ kind: 'other', name: 'Exploit', effect: 'Piochez une carte Exploit.' })
    expect(squareSheet(state, 'detected')).toMatchObject({ name: 'Détecté !', effect: 'Allez directement en quarantaine, sans passer par Boot.' })
  })
})
