<script setup lang="ts">
import { computed, ref } from 'vue'
import { PLAYER_COLORS } from '../../board/boardTheme'
import { AI_LEVELS, DEFAULT_SETTINGS, NET_WORTH_TARGETS, TURN_LIMITS, type GameSettings, type GameState } from '../../engine'
import { formatPwn } from '../../game/format'
import { HOUSE_RULES, NET_WORTH_TARGET_HELP, TURN_LIMIT_HELP } from '../../game/gameOptions'
import {
  addDraft,
  AI_LEVEL_NAMES,
  chooseColor,
  DEFAULT_AI_LEVEL,
  defaultDrafts,
  MAX_NAME_LENGTH,
  MAX_PLAYERS,
  MIN_PLAYERS,
  nameErrors,
  PLAYER_COLOR_NAMES,
  removeDraft,
  renameDraft,
  setKind,
  startGame,
  toConfig,
  type GameConfig,
  type PlayerKind,
} from '../../game/setupForm'

const emit = defineEmits<{
  start: [game: { config: GameConfig; state: GameState }]
  back: []
}>()

const KINDS: { value: PlayerKind; label: string }[] = [
  { value: 'human', label: 'Humain' },
  { value: 'ai', label: 'IA' },
]

const drafts = ref(defaultDrafts())
const settings = ref<GameSettings>({ ...DEFAULT_SETTINGS })
const aiLevel = ref(DEFAULT_AI_LEVEL)
const engineError = ref<string | null>(null)

const errors = computed(() => nameErrors(drafts.value))
const valid = computed(() => Object.values(errors.value).every((error) => error === null))
const hasAi = computed(() => drafts.value.some((draft) => draft.kind === 'ai'))

function start() {
  if (!valid.value) return
  const config = toConfig(drafts.value, settings.value, aiLevel.value)
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
      class="panel-card w-full max-w-4xl p-5 shadow-neon"
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
                class="flex shrink-0 overflow-hidden rounded-md border border-line bg-void"
                role="group"
                :aria-label="`Type du joueur ${index + 1}`"
              >
                <button
                  v-for="kind in KINDS"
                  :key="kind.value"
                  type="button"
                  class="min-h-11 min-w-11 px-3 text-sm font-semibold transition-colors"
                  :class="draft.kind === kind.value ? 'bg-neon text-void' : 'text-muted hover:text-ink'"
                  :data-kind="kind.value"
                  :aria-pressed="draft.kind === kind.value"
                  @click="drafts = setKind(drafts, draft.id, kind.value)"
                >
                  {{ kind.label }}
                </button>
              </div>
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

      <section class="mt-4 grid grid-cols-2 gap-3">
        <div class="rounded-lg border border-line bg-panel px-4 py-3">
          <span
            id="ai-level-title"
            class="font-semibold"
          >Niveau des IA</span>
          <div
            class="mt-2 grid grid-cols-3 gap-1 rounded-lg border border-line bg-void p-1"
            role="radiogroup"
            aria-labelledby="ai-level-title"
          >
            <button
              v-for="level in AI_LEVELS"
              :key="level"
              type="button"
              role="radio"
              class="min-h-11 rounded-md px-2 text-sm font-semibold transition-colors"
              :class="aiLevel === level ? 'bg-neon text-void' : 'text-muted hover:text-ink'"
              :data-level="level"
              :aria-checked="aiLevel === level"
              @click="aiLevel = level"
            >
              {{ AI_LEVEL_NAMES[level] }}
            </button>
          </div>
          <p class="mt-1 text-sm text-muted">
            {{ hasAi ? 'Commun à toutes les IA de la partie.' : 'Aucune IA dans cette partie.' }}
          </p>
        </div>
        <div class="rounded-lg border border-line bg-panel px-4 py-3">
          <label class="flex min-h-11 cursor-pointer items-center gap-3">
            <input
              v-model="settings.auctions"
              type="checkbox"
              data-test="auctions"
              class="h-5 w-5 accent-neon"
            >
            <span class="font-semibold">Enchères</span>
          </label>
          <p class="mt-1 text-sm text-muted">
            {{
              settings.auctions
                ? 'Une case refusée par le joueur qui s’y arrête est mise aux enchères entre tous les joueurs.'
                : 'Une case refusée par le joueur qui s’y arrête reste à la banque.'
            }}
          </p>
        </div>
      </section>

      <section
        class="mt-4"
        aria-labelledby="rules-title"
      >
        <h2
          id="rules-title"
          class="mb-3 text-sm font-semibold uppercase tracking-wider text-muted"
        >
          Options de règles
        </h2>
        <div class="grid grid-cols-2 gap-3">
          <div
            v-for="option in HOUSE_RULES"
            :key="option.rule"
            class="rounded-lg border border-line bg-panel px-4 py-3"
          >
            <label class="flex min-h-11 cursor-pointer items-center gap-3">
              <input
                v-model="settings[option.rule]"
                type="checkbox"
                :data-test="`rule-${option.rule}`"
                class="h-5 w-5 accent-neon"
              >
              <span class="font-semibold">{{ option.name }}</span>
            </label>
            <p class="mt-1 text-sm text-muted">
              {{ option.help }}
            </p>
          </div>
          <div class="rounded-lg border border-line bg-panel px-4 py-3">
            <label class="flex min-h-11 items-center justify-between gap-3">
              <span class="font-semibold">Limite de tours</span>
              <select
                v-model="settings.turnLimit"
                data-test="turn-limit"
                class="min-h-11 rounded-md border border-line bg-void px-3 text-ink outline-none focus:border-neon"
              >
                <option :value="null">Aucune</option>
                <option
                  v-for="limit in TURN_LIMITS"
                  :key="limit"
                  :value="limit"
                >
                  {{ limit }} tours
                </option>
              </select>
            </label>
            <p class="mt-1 text-sm text-muted">
              {{ TURN_LIMIT_HELP }}
            </p>
          </div>
          <div class="rounded-lg border border-line bg-panel px-4 py-3">
            <label class="flex min-h-11 items-center justify-between gap-3">
              <span class="font-semibold">Objectif de patrimoine</span>
              <select
                v-model="settings.netWorthTarget"
                data-test="net-worth-target"
                class="min-h-11 rounded-md border border-line bg-void px-3 text-ink outline-none focus:border-neon"
              >
                <option :value="null">Aucun</option>
                <option
                  v-for="target in NET_WORTH_TARGETS"
                  :key="target"
                  :value="target"
                >
                  {{ formatPwn(target) }}
                </option>
              </select>
            </label>
            <p class="mt-1 text-sm text-muted">
              {{ NET_WORTH_TARGET_HELP }}
            </p>
          </div>
        </div>
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
