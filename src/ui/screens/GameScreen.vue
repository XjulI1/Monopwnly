<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref } from 'vue'
import GameBoard from '../../board/GameBoard.vue'
import type { GameState } from '../../engine'
import { workerDecider } from '../../game/aiDecider'
import { GAME_SESSION, useGameSession } from '../../game/useGameSession'
import ActionPanel from '../hud/ActionPanel.vue'
import ActivityFeed from '../hud/ActivityFeed.vue'
import AppToast from '../hud/AppToast.vue'
import CardReveal from '../hud/CardReveal.vue'
import ConfirmDialog from '../hud/ConfirmDialog.vue'
import DiceTray from '../hud/DiceTray.vue'
import PlayersPanel from '../hud/PlayersPanel.vue'
import PropertySheet from '../hud/PropertySheet.vue'
import SpeedPicker from '../hud/SpeedPicker.vue'
import StatusBar from '../hud/StatusBar.vue'
import GameOverOverlay from './GameOverOverlay.vue'

const props = defineProps<{ initial: GameState }>()

const emit = defineEmits<{
  quit: []
  replay: []
}>()

const ai = props.initial.players.some((p) => p.controller.kind === 'ai') ? workerDecider() : null
const session = useGameSession(props.initial, { ai })
provide(GAME_SESSION, session)

const { displayedState, view, isPresenting, currentStep, dice, send, skip, dismissCard } = session

const board = ref<InstanceType<typeof GameBoard> | null>(null)
const confirmingQuit = ref(false)

const cardId = computed(() => (currentStep.value?.kind === 'card' ? currentStep.value.cardId : null))
const bankruptName = computed(() => {
  const step = currentStep.value
  if (step?.kind !== 'bankrupt') return null
  return displayedState.value.players.find((p) => p.id === step.playerId)?.name ?? null
})
const gameOver = computed(() => displayedState.value.phase.kind === 'gameOver' && !isPresenting.value)

onBeforeUnmount(() => {
  session.dispose()
  ai?.dispose()
})

onMounted(() => {
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
    class="flex h-full w-full overflow-hidden"
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

      <PropertySheet class="absolute bottom-20 right-4 max-h-[calc(100%-6rem)]" />

      <div class="pointer-events-none absolute bottom-4 left-4 right-36 flex justify-center *:pointer-events-auto">
        <AppToast />
      </div>

      <GameOverOverlay
        v-if="gameOver"
        @replay="emit('replay')"
        @home="emit('quit')"
      />
    </main>

    <aside
      class="flex h-full w-80 shrink-0 flex-col border-l border-line bg-panel"
      aria-label="Tableau de bord"
    >
      <StatusBar @quit="confirmingQuit = true" />
      <PlayersPanel class="min-h-24 flex-1 overflow-y-auto" />
      <ActivityFeed
        class="border-t border-line px-2 py-2"
        :size="4"
      />
      <ActionPanel />
      <div class="border-t border-line p-3">
        <SpeedPicker />
      </div>
    </aside>

    <ConfirmDialog
      v-if="confirmingQuit"
      title="Quitter la partie ?"
      message="La partie en cours sera perdue."
      confirm-label="Quitter"
      danger
      @confirm="emit('quit')"
      @cancel="confirmingQuit = false"
    />
  </div>
</template>
