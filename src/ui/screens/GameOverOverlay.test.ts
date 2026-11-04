import { afterEach, describe, expect, it } from 'vitest'
import type { GameState } from '../../engine'
import { A, B, C, act, makeState } from '../../engine/testUtils'
import { startJournal } from '../../game/history/journal'
import { startStatistics, type GameStatistics } from '../../game/history/statistics'
import { useGameSession } from '../../game/useGameSession'
import { mountOnSession, mountWithSession } from '../testUtils'
import { formatPwn } from '../../game/format'
import GameOverOverlay from './GameOverOverlay.vue'

function wonByB(): GameState {
  const start = makeState({
    overrides: [{ cash: 10 }],
    phase: { kind: 'debt', debtor: A, payments: [{ to: B, amount: 500, reason: 'rent' }], resume: { kind: 'postRoll' } },
  })
  return act(start, { type: 'declareBankruptcy', playerId: A }).state
}

function wonByCarol(): { state: GameState; statistics: GameStatistics } {
  const state = makeState({ players: 3, overrides: [{ name: 'Alice', bankrupt: true }, { name: 'Bob', bankrupt: true }, { name: 'Carol' }] })
  state.phase = { kind: 'gameOver' }
  state.winner = C
  state.turnNumber = 40
  const statistics = startStatistics(state)
  statistics.rounds = Array.from({ length: 40 }, (_, i) => ({
    turn: i + 1,
    players: state.players
      .filter((p) => (p.id === A ? i < 18 : p.id === B ? i < 30 : true))
      .map((p) => ({ playerId: p.id, cash: 1500 + i * 10, netWorth: 1500 + i * 40 })),
  }))
  const alice = statistics.players[A]
  const bob = statistics.players[B]
  if (alice) alice.bankruptcy = { turn: 18, creditor: C, rank: 1 }
  if (bob) bob.bankruptcy = { turn: 30, creditor: 'bank', rank: 2 }
  statistics.squareRents = { blog: 265, neobank: 1365, 'tor-node': 400, cloud: 120, minitel: 12, 'ai-kernel': 900 }
  return { state, statistics }
}

function mountEnd() {
  const { state, statistics } = wonByCarol()
  const session = useGameSession(state, { speed: 'instant', history: { journal: startJournal(state), statistics } })
  return mountOnSession(GameOverOverlay, session)
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('GameOverOverlay', () => {
  it('names the winner in their color with the final cash', () => {
    const { wrapper } = mountWithSession(GameOverOverlay, wonByB())
    const title = wrapper.get('#game-over-title')
    expect(title.text()).toBe('Joueur 2 remporte la partie')
    expect(title.attributes('style')).toContain('color: blue')
    expect(wrapper.text()).toContain('Argent final : 1 510 Ᵽ')
  })

  it('gives the reason of the victory', () => {
    const { wrapper } = mountWithSession(GameOverOverlay, wonByB())
    expect(wrapper.get('[data-test="win-reason"]').text()).toBe('Dernier hacker solvable')
  })

  it('shows the turn limit reached and the net worth of every player still in the game', () => {
    const state = makeState({
      players: 3,
      settings: { turnLimit: 30 },
      overrides: [{ name: 'Alice', cash: 4000 }, { name: 'Bob', cash: 0, bankrupt: true }, { name: 'Carol', cash: 7000 }],
    })
    state.phase = { kind: 'gameOver' }
    state.winner = C
    state.winReason = 'turnLimit'
    state.turnNumber = 30
    const statistics = startStatistics(state)
    const bob = statistics.players[B]
    if (bob) bob.bankruptcy = { turn: 12, creditor: 'bank', rank: 1 }
    const session = useGameSession(state, { speed: 'instant', history: { journal: startJournal(state), statistics } })
    const wrapper = mountOnSession(GameOverOverlay, session)
    expect(wrapper.get('[data-test="win-reason"]').text()).toBe('Limite de 30 tours atteinte')
    expect(wrapper.findAll('[data-test="standings"] li').map((li) => li.text())).toEqual([
      `1CarolVainqueur · ${formatPwn(7000)}`,
      `2Alice${formatPwn(4000)}`,
      '3BobFaillite au tour 12 au profit de la banque',
    ])
  })

  it('offers to replay or to go back home', async () => {
    const { wrapper } = mountWithSession(GameOverOverlay, wonByB())
    await wrapper.get('[data-test="replay"]').trigger('click')
    await wrapper.get('[data-test="home"]').trigger('click')
    expect(wrapper.emitted('replay')).toHaveLength(1)
    expect(wrapper.emitted('home')).toHaveLength(1)
  })

  it('stays hidden while there is no winner', () => {
    expect(mountWithSession(GameOverOverlay, makeState()).wrapper.find('[data-test="game-over"]').exists()).toBe(false)
  })

  it('ranks the winner first, then the players from the last bankruptcy to the first', () => {
    const wrapper = mountEnd()
    expect(wrapper.findAll('[data-test="standings"] li').map((li) => li.text())).toEqual([
      '1CarolVainqueur',
      '2BobFaillite au tour 30 au profit de la banque',
      '3AliceFaillite au tour 18 au profit de Carol',
    ])
  })

  it('shows two charts with a line and a legend entry per player in the statistics tab', async () => {
    const wrapper = mountEnd()
    await wrapper.get('[data-test="statistics-tab"]').trigger('click')
    expect(wrapper.get('[data-test="statistics-tab"]').attributes('aria-selected')).toBe('true')
    const charts = wrapper.findAll('[data-test="line-chart"]')
    expect(charts.map((chart) => chart.find('figcaption').text())).toEqual(['Patrimoine par tour', 'Argent liquide par tour'])
    for (const chart of charts) {
      expect(chart.findAll('[data-test="chart-line"]').map((line) => line.attributes('stroke'))).toEqual(['green', 'blue', 'red'])
      expect(chart.findAll('[data-test="chart-legend"] li').map((li) => li.text())).toEqual(['Carol', 'Bob', 'Alice'])
    }
  })

  it('sums the counters up in a table ordered from the winner, and lists the five most profitable squares', async () => {
    const wrapper = mountEnd()
    await wrapper.get('[data-test="statistics-tab"]').trigger('click')
    const table = wrapper.get('[data-test="statistics-table"]')
    expect(table.findAll('thead th').map((th) => th.text())).toEqual(['', 'Carol', 'Bob', 'Alice'])
    expect(table.findAll('tbody tr').map((tr) => tr.find('th').text())).toContain('Loyers perçus')
    expect(wrapper.findAll('[data-test="top-squares"] li').map((li) => li.text())).toEqual([
      '1NéobanqueFinance1 365 Ᵽ',
      '2Noyau de l\'IACœur900 Ᵽ',
      '3Nœud TorNœuds400 Ᵽ',
      '4BlogWeb265 Ᵽ',
      '5CloudServices120 Ᵽ',
    ])
  })
})
