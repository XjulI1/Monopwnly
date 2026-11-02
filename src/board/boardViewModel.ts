import { BOARD, type BuildingLevel, type GameState, type PlayerId, type SquareId } from '../engine'
import type { BoardPoint } from './geometry/layout'
import { pawnSlots } from './geometry/slots'

/** Highlight state of a square, decided by the caller of the board. */
export type Highlight = 'none' | 'selectable' | 'selected'

/** Highlights by square index; squares left out are not highlighted. */
export type Highlights = Partial<Record<number, Highlight>>

/** What the board needs to draw one square. */
export type SquareView = {
  index: number
  id: SquareId
  owner: PlayerId | null
  ownerColor: string | null
  mortgaged: boolean
  level: BuildingLevel
  highlight: Highlight
  dimmed: boolean
}

/** What the board needs to draw one pawn. */
export type PawnView = {
  playerId: PlayerId
  color: string
  square: number
  quarantined: boolean
  position: BoardPoint
}

export type BoardView = { squares: SquareView[]; pawns: PawnView[] }

/** Visual treatment of each highlight: how high the tile rises and how much its edge glows. */
export const HIGHLIGHT_STYLES: Record<Highlight, { lift: number; glow: number }> = {
  none: { lift: 0, glow: 0 },
  selectable: { lift: 0.3, glow: 0.6 },
  selected: { lift: 0.8, glow: 1.4 },
}

/** Turns a game state and the caller's highlights into the display data of every square and pawn. */
export function boardViewModel(state: GameState, highlights: Highlights): BoardView {
  const colors = new Map(state.players.map((p) => [p.id, p.color]))
  const anySelectable = Object.values(highlights).includes('selectable')

  const squares = BOARD.map((square): SquareView => {
    const own = state.ownership[square.id]
    const highlight = highlights[square.index] ?? 'none'
    return {
      index: square.index,
      id: square.id,
      owner: own?.owner ?? null,
      ownerColor: own ? (colors.get(own.owner) ?? null) : null,
      mortgaged: own?.mortgaged ?? false,
      level: own?.level ?? 0,
      highlight,
      dimmed: anySelectable && highlight === 'none',
    }
  })

  const groups = new Map<string, PlayerId[]>()
  const active = state.players.filter((p) => !p.bankrupt)
  for (const player of active) {
    const key = `${player.position}:${player.quarantine !== null}`
    groups.set(key, [...(groups.get(key) ?? []), player.id])
  }
  const pawns = active.map((player): PawnView => {
    const quarantined = player.quarantine !== null
    const group = groups.get(`${player.position}:${quarantined}`) ?? []
    const slots = pawnSlots(player.position, group.length, quarantined)
    return {
      playerId: player.id,
      color: player.color,
      square: player.position,
      quarantined,
      position: slots[group.indexOf(player.id)] ?? slots[0] ?? { x: 0, z: 0 },
    }
  })

  return { squares, pawns }
}
