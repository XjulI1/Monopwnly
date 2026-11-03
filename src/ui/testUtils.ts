import { mount } from '@vue/test-utils'
import type { Component } from 'vue'
import type { GameState } from '../engine'
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
