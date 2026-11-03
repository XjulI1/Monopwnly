<script setup lang="ts">
import { computed, ref } from 'vue'
import { PLAYER_COLORS } from '../../board/boardTheme'
import type { GameState } from '../../engine'
import {
  addDraft,
  chooseColor,
  defaultDrafts,
  MAX_NAME_LENGTH,
  MAX_PLAYERS,
  MIN_PLAYERS,
  nameErrors,
  PLAYER_COLOR_NAMES,
  removeDraft,
  renameDraft,
  startGame,
  toConfig,
  type GameConfig,
} from '../../game/setupForm'

const emit = defineEmits<{
  start: [game: { config: GameConfig; state: GameState }]
  back: []
}>()

const drafts = ref(defaultDrafts())
const auctions = ref(true)
const engineError = ref<string | null>(null)

const errors = computed(() => nameErrors(drafts.value))
const valid = computed(() => Object.values(errors.value).every((error) => error === null))

function start() {
  if (!valid.value) return
  const config = toConfig(drafts.value, auctions.value)
  const result = startGame(config)
  if (!result.ok) {
    engineError.value = result.error.message
    return
  }
  engineError.value = null
  emit('start', { config, state: result.state })
}
</script>

<template>
  <div class="flex min-h-full items-center justify-center p-4">
    <form
      class="panel-card w-full max-w-3xl p-5 shadow-neon"
      @submit.prevent="start"
    >
      <header class="mb-4 flex items-center justify-between gap-4">
        <h1 class="neon-title text-2xl font-bold">
          Nouvelle partie
        </h1>
        <button
          type="button"
          class="btn btn-ghost"
          @click="emit('back')"
        >
          Retour
        </button>
      </header>

      <section aria-labelledby="players-title">
        <h2
          id="players-title"
          class="mb-3 text-sm font-semibold uppercase tracking-wider text-muted"
        >
          Joueurs ({{ drafts.length }}/{{ MAX_PLAYERS }})
        </h2>
        <ul class="flex flex-col gap-2">
          <li
            v-for="(draft, index) in drafts"
            :key="draft.id"
            data-test="player-row"
            class="rounded-lg border border-line bg-panel px-3 py-2"
          >
            <div class="flex items-center gap-3">
              <span
                class="h-4 w-4 shrink-0 rounded-full"
                :style="{ background: draft.color, boxShadow: `0 0 10px ${draft.color}` }"
              />
              <label class="flex min-w-0 flex-1 flex-col gap-1">
                <span class="sr-only">Nom du joueur {{ index + 1 }}</span>
                <input
                  type="text"
                  class="min-h-11 rounded-md border bg-void px-3 text-ink outline-none focus:border-neon"
                  :class="errors[draft.id] ? 'border-loss' : 'border-line'"
                  :value="draft.name"
                  :maxlength="MAX_NAME_LENGTH + 10"
                  :aria-invalid="errors[draft.id] !== null"
                  @input="drafts = renameDraft(drafts, draft.id, ($event.target as HTMLInputElement).value)"
                >
              </label>
              <div
                class="flex gap-1"
                role="group"
                :aria-label="`Couleur du joueur ${index + 1}`"
              >
                <button
                  v-for="color in PLAYER_COLORS"
                  :key="color"
                  type="button"
                  class="flex h-11 w-11 items-center justify-center rounded-md border"
                  :class="draft.color === color ? 'border-ink' : 'border-transparent'"
                  :data-color="color"
                  :aria-pressed="draft.color === color"
                  :aria-label="PLAYER_COLOR_NAMES[color]"
                  :title="PLAYER_COLOR_NAMES[color]"
                  @click="drafts = chooseColor(drafts, draft.id, color)"
                >
                  <span
                    class="h-6 w-6 rounded-full"
                    :style="{ background: color }"
                  />
                </button>
              </div>
              <button
                type="button"
                data-test="remove-player"
                class="btn btn-ghost px-3"
                :disabled="drafts.length <= MIN_PLAYERS"
                :aria-label="`Retirer ${draft.name || `le joueur ${index + 1}`}`"
                @click="drafts = removeDraft(drafts, draft.id)"
              >
                Retirer
              </button>
            </div>
            <p
              v-if="errors[draft.id]"
              class="mt-2 text-sm text-loss"
              role="alert"
            >
              {{ errors[draft.id] }}
            </p>
          </li>
        </ul>
        <button
          type="button"
          data-test="add-player"
          class="btn btn-ghost mt-2"
          :disabled="drafts.length >= MAX_PLAYERS"
          @click="drafts = addDraft(drafts)"
        >
          Ajouter un joueur
        </button>
      </section>

      <section class="mt-4 rounded-lg border border-line bg-panel px-4 py-3">
        <label class="flex min-h-11 cursor-pointer items-center gap-3">
          <input
            v-model="auctions"
            type="checkbox"
            data-test="auctions"
            class="h-5 w-5 accent-neon"
          >
          <span class="font-semibold">Enchères</span>
        </label>
        <p class="mt-1 text-sm text-muted">
          {{
            auctions
              ? 'Une case refusée par le joueur qui s’y arrête est mise aux enchères entre tous les joueurs.'
              : 'Une case refusée par le joueur qui s’y arrête reste à la banque.'
          }}
        </p>
      </section>

      <p
        v-if="engineError"
        class="mt-4 rounded-md border border-loss/60 bg-loss/10 p-3 text-sm text-loss"
        role="alert"
      >
        {{ engineError }}
      </p>

      <footer class="mt-4 flex justify-end">
        <button
          type="button"
          data-test="start"
          class="btn btn-primary px-6"
          :disabled="!valid"
          @click="start"
        >
          Lancer la partie
        </button>
      </footer>
    </form>
  </div>
</template>
