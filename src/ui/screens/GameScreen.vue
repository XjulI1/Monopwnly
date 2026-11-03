<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref } from 'vue'
import GameBoard from '../../board/GameBoard.vue'
import type { GameState } from '../../engine'
import { workerDecider } from '../../game/aiDecider'
import { createSaver } from '../../game/persistence'
import type { GameConfig } from '../../game/setupForm'
import { GAME_SESSION, useGameSession, type GameHistory } from '../../game/useGameSession'
import ActionPanel from '../hud/ActionPanel.vue'
import JournalPanel from '../hud/JournalPanel.vue'
import AppToast from '../hud/AppToast.vue'
import CardReveal from '../hud/CardReveal.vue'
import DiceTray from '../hud/DiceTray.vue'
import PlayersPanel from '../hud/PlayersPanel.vue'
import PropertySheet from '../hud/PropertySheet.vue'
import SpeedPicker from '../hud/SpeedPicker.vue'
import StatusBar from '../hud/StatusBar.vue'
import TradeComposer from '../hud/TradeComposer.vue'
import TradeOfferDialog from '../hud/TradeOfferDialog.vue'
import GameOverOverlay from './GameOverOverlay.vue'

const props = defineProps<{ initial: GameState; config: GameConfig; history?: GameHistory | null }>()

const emit = defineEmits<{
  quit: []
  home: []
  replay: []
}>()

const ai = props.initial.players.some((p) => p.controller.kind === 'ai') ? workerDecider() : null
const session = useGameSession(props.initial, { ai, history: props.history, save: createSaver(props.config) })
provide(GAME_SESSION, session)

const { displayedState, view, isPresenting, currentStep, dice, send, skip, dismissCard } = session

const board = ref<InstanceType<typeof GameBoard> | null>(null)

const cardId = computed(() => (currentStep.value?.kind === 'card' ? currentStep.value.cardId : null))
const bankruptName = computed(() => {
  const step = currentStep.value
  if (step?.kind !== 'bankrupt') return null
  return displayedState.value.players.find((p) => p.id === step.playerId)?.name ?? null
})
const gameOver = computed(() => displayedState.value.phase.kind === 'gameOver' && !isPresenting.value)

onBeforeUnmount(() => {
  window.removeEventListener('pagehide', session.flushSave)
  session.dispose()
  ai?.dispose()
})

onMounted(() => {
  window.addEventListener('pagehide', session.flushSave)
  session.attachBoard({
    animateMove: (playerId, squares, msPerSquare) => board.value?.animateMove(playerId, squares, msPerSquare) ?? Promise.resolve(),
  })
})

function onSelect(index: number | null) {
  send(index === null ? { kind: 'outside' } : { kind: 'square', index })
}

function skipOnTap(event: PointerEvent) {
  if (!isPresenting.value) return
  if (event.target instanceof Element && event.target.closest('[data-keep-presenting]')) return
  event.stopPropagation()
  event.preventDefault()
  skip()
}
</script>

<template>
  <div
    class="relative flex h-full w-full overflow-hidden"
    :aria-busy="isPresenting"
    @pointerdown.capture="skipOnTap"
  >
    <main class="relative h-full min-w-0 flex-1">
      <GameBoard
        ref="board"
        :state="displayedState"
        :highlights="view.highlights"
        follow-pawn
        @select="onSelect"
      />

      <div class="pointer-events-none absolute inset-x-0 top-6 flex justify-center">
        <DiceTray
          v-if="dice"
          :key="dice.id"
          :dice="dice.dice"
          :roll-ms="dice.rollMs"
        />
      </div>

      <div
        v-if="cardId || bankruptName"
        class="absolute inset-0 flex items-center justify-center p-6"
      >
        <CardReveal
          v-if="cardId"
          :card-id="cardId"
          @dismiss="dismissCard"
        />
        <p
          v-else
          class="panel-card border-loss px-6 py-4 text-2xl font-bold text-loss shadow-lg"
          role="status"
        >
          {{ bankruptName }} fait faillite
        </p>
      </div>

      <div
        v-if="view.offer && !view.thinking && !isPresenting"
        class="absolute inset-0 z-30 flex items-center justify-center bg-void/50 p-6"
      >
        <TradeOfferDialog />
      </div>

      <TradeComposer class="absolute left-4 top-4 z-20 max-h-[calc(100%-6rem)]" />

      <PropertySheet class="absolute bottom-20 right-4 max-h-[calc(100%-6rem)]" />

      <div class="pointer-events-none absolute bottom-4 left-4 right-36 flex justify-center *:pointer-events-auto">
        <AppToast />
      </div>
    </main>

    <aside
      class="flex h-full w-80 shrink-0 flex-col border-l border-line bg-panel"
      aria-label="Tableau de bord"
    >
      <StatusBar @quit="emit('quit')" />
      <PlayersPanel class="min-h-24 overflow-y-auto" />
      <JournalPanel class="border-t border-line px-2 py-1" />
      <ActionPanel class="mt-auto shrink-0" />
      <div class="shrink-0 border-t border-line p-3">
        <SpeedPicker />
      </div>
    </aside>

    <GameOverOverlay
      v-if="gameOver"
      @replay="emit('replay')"
      @home="emit('home')"
    />
  </div>
</template>
