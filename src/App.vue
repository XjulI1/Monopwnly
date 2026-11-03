<script setup lang="ts">
import { shallowRef } from 'vue'
import type { GameState } from './engine'
import { deleteSavedGame } from './game/persistence'
import type { SavedGame } from './game/savedGame'
import { startGame, type GameConfig } from './game/setupForm'
import type { GameHistory } from './game/useGameSession'
import CreateGameScreen from './ui/screens/CreateGameScreen.vue'
import GameScreen from './ui/screens/GameScreen.vue'
import HomeScreen from './ui/screens/HomeScreen.vue'

type Screen =
  | { kind: 'home' }
  | { kind: 'create' }
  | { kind: 'game'; id: number; config: GameConfig; state: GameState; history: GameHistory | null }

const screen = shallowRef<Screen>({ kind: 'home' })
let gamesStarted = 0

function play(config: GameConfig, state: GameState, history: GameHistory | null = null) {
  gamesStarted += 1
  screen.value = { kind: 'game', id: gamesStarted, config, state, history }
}

function resume(game: SavedGame) {
  play(game.creation, game.engineState, { journal: game.journal, statistics: game.statistics })
}

function leaveEndScreen() {
  deleteSavedGame()
  screen.value = { kind: 'home' }
}

function replay() {
  const current = screen.value
  if (current.kind !== 'game') return
  deleteSavedGame()
  const result = startGame(current.config)
  if (result.ok) play(current.config, result.state)
}
</script>

<template>
  <HomeScreen
    v-if="screen.kind === 'home'"
    @create="screen = { kind: 'create' }"
    @resume="resume"
    @review="resume"
  />
  <CreateGameScreen
    v-else-if="screen.kind === 'create'"
    @start="play($event.config, $event.state)"
    @back="screen = { kind: 'home' }"
  />
  <GameScreen
    v-else
    :key="screen.id"
    :initial="screen.state"
    :config="screen.config"
    :history="screen.history"
    @quit="screen = { kind: 'home' }"
    @home="leaveEndScreen"
    @replay="replay"
  />
</template>
