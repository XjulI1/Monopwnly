<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatSavedAt } from '../../game/format'
import { loadSavedGame } from '../../game/persistence'
import type { SavedGame } from '../../game/savedGame'
import ConfirmDialog from '../hud/ConfirmDialog.vue'

defineProps<{
  /** Une nouvelle version de l'application est prête à être activée (faux par défaut). */
  updateReady?: boolean
}>()

const emit = defineEmits<{
  create: []
  resume: [game: SavedGame]
  review: [game: SavedGame]
  reload: []
}>()

const lookup = loadSavedGame()
const saved = lookup.kind === 'found' ? lookup.game : null
const unreadable = lookup.kind === 'unreadable'
const confirmingReplace = ref(false)

const inProgress = computed(() => saved?.status === 'inProgress')
const players = computed(() => saved?.engineState.players ?? [])
const winner = computed(() => players.value.find((p) => p.id === saved?.engineState.winner) ?? null)

function create() {
  if (inProgress.value) confirmingReplace.value = true
  else emit('create')
}

function replace() {
  confirmingReplace.value = false
  emit('create')
}
</script>

<template>
  <div class="relative flex h-full flex-col items-center justify-center gap-10 overflow-hidden p-6">
    <div
      class="grid-backdrop pointer-events-none absolute inset-0"
      aria-hidden="true"
    />
    <div
      v-if="updateReady"
      class="panel-card absolute top-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-4 py-2 pr-2 pl-5 shadow-neon"
      role="status"
      data-test="update-banner"
    >
      <span class="text-sm font-semibold">Nouvelle version disponible</span>
      <button
        type="button"
        class="btn btn-primary"
        data-test="reload"
        @click="emit('reload')"
      >
        Recharger
      </button>
    </div>
    <div class="relative flex flex-col items-center gap-3 text-center">
      <p class="font-mono text-sm tracking-[0.4em] text-patch">
        &gt; ./connect --target=board
      </p>
      <h1 class="neon-title text-6xl font-black">
        MONOPWNLY
      </h1>
      <p class="max-w-md text-muted">
        Piratez des systèmes, installez des backdoors et des rootkits, ruinez vos adversaires en PwnCoins.
      </p>
    </div>

    <p
      v-if="unreadable"
      class="relative rounded-md border border-warning/60 bg-warning/10 px-4 py-2 text-sm text-warning"
      role="status"
    >
      La sauvegarde précédente n’a pas pu être chargée
    </p>

    <section
      v-if="saved"
      class="panel-card relative flex w-full max-w-md flex-col gap-3 p-5"
      :aria-label="inProgress ? 'Partie en cours' : 'Dernière partie'"
      data-test="saved-game"
    >
      <p class="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
        {{ inProgress ? 'Partie en cours' : 'Dernière partie' }}
      </p>
      <ul class="flex flex-wrap gap-x-4 gap-y-1">
        <li
          v-for="player in players"
          :key="player.id"
          class="flex items-center gap-2 font-semibold"
          :class="{ 'line-through opacity-50': player.bankrupt }"
        >
          <span
            class="h-2.5 w-2.5 shrink-0 rounded-full"
            :style="{ background: player.color, boxShadow: `0 0 6px ${player.color}` }"
          />
          <span :style="{ color: player.color }">{{ player.name }}</span>
        </li>
      </ul>
      <p class="text-sm text-muted">
        <template v-if="winner">
          <span :style="{ color: winner.color }">{{ winner.name }}</span> a gagné ·
        </template>
        Tour {{ saved.engineState.turnNumber }} · sauvegardée le {{ formatSavedAt(saved.savedAt) }}
      </p>
      <button
        v-if="inProgress"
        type="button"
        class="btn btn-primary"
        data-test="resume"
        @click="emit('resume', saved)"
      >
        Reprendre la partie
      </button>
      <button
        v-else
        type="button"
        class="btn btn-primary"
        data-test="review"
        @click="emit('review', saved)"
      >
        Voir la dernière partie
      </button>
    </section>

    <button
      type="button"
      class="btn relative px-8 text-lg"
      :class="inProgress ? 'btn-ghost' : 'btn-primary'"
      data-test="new-game"
      @click="create"
    >
      Nouvelle partie
    </button>

    <ConfirmDialog
      v-if="confirmingReplace"
      title="Remplacer la partie en cours ?"
      message="La partie sauvegardée sera remplacée par la nouvelle partie dès son lancement."
      confirm-label="Nouvelle partie"
      danger
      @confirm="replace"
      @cancel="confirmingReplace = false"
    />
  </div>
</template>

<style scoped>
.grid-backdrop {
  background-image:
    linear-gradient(#19e3ff14 1px, transparent 1px),
    linear-gradient(90deg, #19e3ff14 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(circle at center, black 20%, transparent 75%);
}
</style>
