<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import GameBoard from './board/GameBoard.vue'
import { PLAYER_COLORS } from './board/boardTheme'
import type { Highlights } from './board/boardViewModel'
import {
  applyAction,
  BOARD,
  buildableSquares,
  createGame,
  expectedActor,
  type Action,
  type GameEvent,
  type GameState,
} from './engine'

const MS_PER_SQUARE = 180
const MAX_ACTIONS_PER_TURN = 60

function newGame(): GameState {
  const names = ['Alice', 'Bob', 'Chloé', 'David']
  const result = createGame({
    players: names.map((name, i) => ({ id: `p${i + 1}`, name, color: PLAYER_COLORS[i] ?? '#ffffff' })),
    seed: Date.now(),
  })
  if (!result.ok) throw new Error(result.error.message)
  return result.state
}

const state = shallowRef<GameState>(newGame())
const board = ref<InstanceType<typeof GameBoard> | null>(null)
const selected = ref<number | null>(null)
const busy = ref(false)
const log = ref<string[]>([])

const highlights = computed<Highlights>(() => (selected.value === null ? {} : { [selected.value]: 'selected' }))
const selectedName = computed(() => (selected.value === null ? null : (BOARD[selected.value]?.name ?? null)))

function nextAction(current: GameState): Action | null {
  const actor = expectedActor(current)
  if (!actor) return null
  const phase = current.phase
  switch (phase.kind) {
    case 'preRoll':
      return { type: 'rollDice', playerId: actor }
    case 'buyDecision': {
      const price = BOARD.find((s) => s.id === phase.squareId)
      const cash = current.players.find((p) => p.id === actor)?.cash ?? 0
      const affordable = price && 'price' in price && price.price <= cash
      return { type: affordable ? 'buyProperty' : 'declineProperty', playerId: actor }
    }
    case 'auction':
      return { type: 'passBid', playerId: actor }
    case 'debt': {
      const pay = applyAction(current, { type: 'payDebt', playerId: actor })
      return pay.ok ? { type: 'payDebt', playerId: actor } : { type: 'declareBankruptcy', playerId: actor }
    }
    case 'postRoll': {
      const [build] = buildableSquares(current, actor)
      if (build) return { type: 'buildBackdoor', playerId: actor, squareId: build }
      return { type: phase.mayRollAgain ? 'rollDice' : 'endTurn', playerId: actor }
    }
    case 'gameOver':
      return null
  }
}

async function animate(before: GameState, events: GameEvent[]): Promise<void> {
  const positions = new Map(before.players.map((p) => [p.id, p.position]))
  for (const event of events) {
    if (event.type === 'moved') {
      const from = positions.get(event.playerId) ?? event.path[0] ?? 0
      await board.value?.animateMove(event.playerId, [from, ...event.path], MS_PER_SQUARE)
      positions.set(event.playerId, event.path.at(-1) ?? from)
    }
    if (event.type === 'sentToQuarantine') {
      const from = positions.get(event.playerId) ?? 10
      await board.value?.animateMove(event.playerId, [from, 10], MS_PER_SQUARE * 3)
      positions.set(event.playerId, 10)
    }
  }
}

function describe(events: GameEvent[], current: GameState): string[] {
  const name = (id: string) => current.players.find((p) => p.id === id)?.name ?? id
  const square = (id: string) => BOARD.find((s) => s.id === id)?.name ?? id
  return events.flatMap((e) => {
    switch (e.type) {
      case 'diceRolled':
        return [`${name(e.playerId)} lance ${e.dice[0]} et ${e.dice[1]}`]
      case 'propertyBought':
        return [`${name(e.playerId)} achète ${square(e.squareId)}`]
      case 'backdoorBuilt':
        return [`${name(e.playerId)} construit sur ${square(e.squareId)}`]
      case 'bankrupt':
        return [`${name(e.playerId)} fait faillite`]
      case 'gameWon':
        return [`${name(e.playerId)} gagne la partie`]
      default:
        return []
    }
  })
}

async function playTurn() {
  if (busy.value || state.value.phase.kind === 'gameOver') return
  busy.value = true
  const startIndex = state.value.currentPlayerIndex
  try {
    for (let i = 0; i < MAX_ACTIONS_PER_TURN; i++) {
      const before = state.value
      const action = nextAction(before)
      if (!action) break
      const result = applyAction(before, action)
      if (!result.ok) break
      state.value = result.state
      log.value = [...describe(result.events, result.state), ...log.value].slice(0, 8)
      await animate(before, result.events)
      if (action.type === 'endTurn' || result.state.currentPlayerIndex !== startIndex) break
    }
  } finally {
    busy.value = false
  }
}

function restart() {
  state.value = newGame()
  selected.value = null
  log.value = []
}
</script>

<template>
  <div class="demo">
    <GameBoard
      ref="board"
      :state="state"
      :highlights="highlights"
      follow-pawn
      @select="selected = $event"
    />
    <aside class="panel">
      <h1>Monopwnly</h1>
      <p class="hint">
        Démonstration du plateau
      </p>
      <ul class="players">
        <li
          v-for="player in state.players"
          :key="player.id"
          :class="{ current: state.players[state.currentPlayerIndex]?.id === player.id, out: player.bankrupt }"
        >
          <span
            class="dot"
            :style="{ background: player.color }"
          />
          {{ player.name }} — {{ player.cash.toLocaleString('fr-FR') }} Ᵽ
        </li>
      </ul>
      <button
        type="button"
        :disabled="busy || state.phase.kind === 'gameOver'"
        @click="playTurn"
      >
        Tour suivant
      </button>
      <button
        type="button"
        class="secondary"
        @click="restart"
      >
        Nouvelle partie
      </button>
      <p
        v-if="selectedName"
        class="selected"
      >
        Case sélectionnée : {{ selectedName }}
      </p>
      <ol class="log">
        <li
          v-for="(line, i) in log"
          :key="i"
        >
          {{ line }}
        </li>
      </ol>
    </aside>
  </div>
</template>

<style>
html,
body,
#app {
  height: 100%;
  margin: 0;
  background: #04060c;
}
</style>

<style scoped>
.demo {
  position: relative;
  height: 100%;
}

.panel {
  position: absolute;
  top: 16px;
  left: 16px;
  width: 260px;
  padding: 16px;
  border: 1px solid #19e3ff55;
  border-radius: 12px;
  background: rgba(4, 8, 16, 0.88);
  color: #e8f1ff;
  font: 14px/1.4 system-ui, sans-serif;
}

h1 {
  margin: 0;
  color: #19e3ff;
  font-size: 22px;
  letter-spacing: 0.08em;
}

.hint {
  margin: 2px 0 12px;
  color: #8fa3bf;
}

.players {
  margin: 0 0 12px;
  padding: 0;
  list-style: none;
}

.players li {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 2px 0;
}

.players .current {
  font-weight: 700;
}

.players .out {
  opacity: 0.4;
  text-decoration: line-through;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

button {
  width: 100%;
  min-height: 44px;
  margin-bottom: 8px;
  border: none;
  border-radius: 8px;
  background: #19e3ff;
  color: #04060c;
  font-weight: 700;
  cursor: pointer;
}

button.secondary {
  border: 1px solid #19e3ff88;
  background: transparent;
  color: #e8f1ff;
}

button:disabled {
  opacity: 0.5;
  cursor: default;
}

.selected {
  color: #ffd23f;
}

.log {
  margin: 8px 0 0;
  padding-left: 18px;
  color: #8fa3bf;
  font-size: 12px;
}
</style>
