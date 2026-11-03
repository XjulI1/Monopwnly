import { mount } from '@vue/test-utils'
import type { Component } from 'vue'
import type { GameState } from '../engine'
import { startJournal } from '../game/history/journal'
import { startStatistics } from '../game/history/statistics'
import { SAVE_FORMAT_VERSION, type SavedGame, type SavedGameStatus } from '../game/savedGame'
import { GAME_SESSION, useGameSession, type GameSession } from '../game/useGameSession'

/** Mounts a component that injects the given game session. */
export function mountOnSession(component: Component, session: GameSession) {
  return mount(component, { global: { provide: { [GAME_SESSION as symbol]: session } }, attachTo: document.body })
}

/** Mounts a component with a new game session on the state, presented at instant speed. */
export function mountWithSession(component: Component, state: GameState) {
  const session = useGameSession(state, { speed: 'instant' })
  return { wrapper: mountOnSession(component, session), session }
}

/** A saved game of the state, as the persistence would write it. */
export function savedGameFor(state: GameState, status: SavedGameStatus = 'inProgress'): SavedGame {
  return {
    formatVersion: SAVE_FORMAT_VERSION,
    savedAt: '2026-11-03T12:00:00.000Z',
    status,
    creation: {
      players: state.players.map((p) => ({ id: p.id, name: p.name, color: p.color, controller: p.controller })),
      settings: { ...state.settings },
    },
    engineState: state,
    journal: startJournal(state),
    statistics: startStatistics(state),
  }
}
