import { describe, expect, it } from 'vitest'
import { A, B, C, makeState, player } from '../../engine/testUtils'
import { startStatistics, type GameStatistics } from './statistics'
import { bankruptcyLine, ranking, topSquares, wealthSeries } from './summary'

function ended(winner: string, bankruptcies: Record<string, { turn: number; rank: number; creditor?: string; voluntary?: boolean }>) {
  const state = makeState({ players: 3 })
  state.phase = { kind: 'gameOver' }
  state.winner = winner
  for (const p of state.players) p.bankrupt = p.id in bankruptcies
  const stats = startStatistics(state)
  for (const [id, { turn, rank, creditor, voluntary }] of Object.entries(bankruptcies)) {
    const counters = stats.players[id]
    if (counters) counters.bankruptcy = { turn, rank, creditor: creditor ?? winner, voluntary: voluntary ?? false }
  }
  return { state, stats }
}

describe('ranking', () => {
  it('puts the winner first, then the others from the last bankruptcy to the first', () => {
    const { state, stats } = ended(C, { [A]: { turn: 18, rank: 1 }, [B]: { turn: 30, rank: 2 } })
    expect(ranking(state, stats)).toEqual([C, B, A])
  })

  it('puts the players still in the game after the winner, by net worth, before the bankrupt ones', () => {
    const state = makeState({ players: 4, overrides: [{ cash: 4000 }, { cash: 0, bankrupt: true }, { cash: 7000 }, { cash: 5000 }] })
    state.phase = { kind: 'gameOver' }
    state.winner = C
    state.winReason = 'turnLimit'
    const stats = startStatistics(state)
    const bob = stats.players[B]
    if (bob) bob.bankruptcy = { turn: 12, rank: 1, creditor: 'bank', voluntary: false }
    expect(ranking(state, stats)).toEqual([C, 'p4', A, B])
  })
})

describe('bankruptcyLine', () => {
  it('dates the bankruptcy and names the creditor', () => {
    const { state, stats } = ended(A, { [B]: { turn: 23, rank: 1 }, [C]: { turn: 9, rank: 2, creditor: 'bank' } })
    player(state, A).name = 'Alice'
    expect(bankruptcyLine(state, stats.players[B]?.bankruptcy ?? null)).toBe('Faillite au tour 23 au profit d’Alice')
    expect(bankruptcyLine(state, stats.players[C]?.bankruptcy ?? null)).toBe('Faillite au tour 9 au profit de la banque')
    expect(bankruptcyLine(state, null)).toBeNull()
  })

  it('dates a player giving up without naming the bank', () => {
    const { state, stats } = ended(A, { [B]: { turn: 15, rank: 1, creditor: 'bank', voluntary: true } })
    expect(bankruptcyLine(state, stats.players[B]?.bankruptcy ?? null)).toBe('Abandon au tour 15')
  })

  it('ranks a player who gave up among the bankrupt ones, from the last to the first', () => {
    const { state, stats } = ended(C, { [A]: { turn: 18, rank: 1 }, [B]: { turn: 30, rank: 2, creditor: 'bank', voluntary: true } })
    expect(ranking(state, stats)).toEqual([C, B, A])
  })
})

describe('wealthSeries', () => {
  it('draws one point per round for each player, in the order given, and stops at the bankruptcy', () => {
    const state = makeState({ players: 3 })
    const stats: GameStatistics = {
      ...startStatistics(state),
      rounds: Array.from({ length: 40 }, (_, i) => ({
        turn: i + 1,
        players: state.players
          .filter((p) => p.id !== B || i < 12)
          .map((p) => ({ playerId: p.id, cash: 1000 + i, netWorth: 2000 + i })),
      })),
    }
    const lines = wealthSeries(state, stats, [C, A, B], 'netWorth')
    expect(lines.map((line) => [line.id, line.name, line.color, line.points.length])).toEqual([
      [C, 'Joueur 3', 'green', 40],
      [A, 'Joueur 1', 'red', 40],
      [B, 'Joueur 2', 'blue', 12],
    ])
    expect(lines[1]?.points[2]).toEqual({ turn: 3, value: 2002 })
    expect(wealthSeries(state, stats, [A], 'cash')[0]?.points[2]).toEqual({ turn: 3, value: 1002 })
  })
})

describe('topSquares', () => {
  it('lists the five squares that earned the most rent, with their family', () => {
    const stats = {
      ...startStatistics(makeState()),
      squareRents: { blog: 265, 'tor-node': 400, cloud: 120, minitel: 12, neobank: 1365, 'ai-kernel': 900, forum: 70 },
    }
    expect(topSquares(stats)).toEqual([
      { squareId: 'neobank', name: 'Néobanque', family: 'Finance', total: 1365 },
      { squareId: 'ai-kernel', name: 'Noyau de l\'IA', family: 'Cœur', total: 900 },
      { squareId: 'tor-node', name: 'Nœud Tor', family: 'Nœuds', total: 400 },
      { squareId: 'blog', name: 'Blog', family: 'Web', total: 265 },
      { squareId: 'cloud', name: 'Cloud', family: 'Services', total: 120 },
    ])
  })
})
