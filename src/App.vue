<script setup lang="ts">
import { shallowRef } from 'vue'
import type { GameState } from './engine'
import { startGame, type GameConfig } from './game/setupForm'
import CreateGameScreen from './ui/screens/CreateGameScreen.vue'
import GameScreen from './ui/screens/GameScreen.vue'
import HomeScreen from './ui/screens/HomeScreen.vue'

type Screen =
  | { kind: 'home' }
  | { kind: 'create' }
  | { kind: 'game'; id: number; config: GameConfig; state: GameState }

const screen = shallowRef<Screen>({ kind: 'home' })
let gamesStarted = 0

function play(config: GameConfig, state: GameState) {
  gamesStarted += 1
  screen.value = { kind: 'game', id: gamesStarted, config, state }
}

function replay() {
  const current = screen.value
  if (current.kind !== 'game') return
  const result = startGame(current.config)
  if (result.ok) play(current.config, result.state)
}
</script>

<template>
  <HomeScreen
    v-if="screen.kind === 'home'"
    @create="screen = { kind: 'create' }"
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
    @quit="screen = { kind: 'home' }"
    @replay="replay"
  />
</template>
