<script setup lang="ts">
import { computed } from 'vue'
import { FAMILY_COLORS } from '../../board/boardTheme'
import { purchasableById, squareById, type CardId, type PlayerId, type SquareId } from '../../engine'
import { formatPwn } from '../../game/format'
import { EMPTY_SIDE, type TradeColumn, type TradeDraft } from '../../game/interaction'
import { useInjectedGameSession } from '../../game/useGameSession'

type SideKey = 'give' | 'receive'

const CASH_STEP = 10
const NEUTRAL = 'var(--color-muted)'

const { view, displayedState, send } = useInjectedGameSession()

const composer = computed(() => view.value.trade)
const columns = computed(() => {
  const current = composer.value
  if (!current) return []
  return [
    { key: 'give' as const, title: 'Vous donnez', column: current.give },
    { key: 'receive' as const, title: 'Vous demandez', column: current.receive },
  ]
})

function player(id: PlayerId) {
  return displayedState.value.players.find((p) => p.id === id)
}

function colorOf(squareId: SquareId): string {
  const square = purchasableById(squareId)
  return square?.kind === 'system' ? FAMILY_COLORS[square.family] : NEUTRAL
}

function update(change: (draft: TradeDraft) => TradeDraft) {
  const draft = composer.value?.draft
  if (draft) send({ kind: 'tradeDraft', draft: change(draft) })
}

function choosePartner(partner: PlayerId) {
  update((draft) => ({ ...draft, partner, receive: EMPTY_SIDE }))
}

function toggle<T>(items: readonly T[], item: T): T[] {
  return items.includes(item) ? items.filter((other) => other !== item) : [...items, item]
}

function toggleSquare(side: SideKey, squareId: SquareId) {
  update((draft) => ({ ...draft, [side]: { ...draft[side], squares: toggle(draft[side].squares, squareId) } }))
}

function toggleKey(side: SideKey, cardId: CardId) {
  update((draft) => ({ ...draft, [side]: { ...draft[side], keys: toggle(draft[side].keys, cardId) } }))
}

function changeCash(side: SideKey, column: TradeColumn, delta: number) {
  const cash = Math.min(column.maxCash, Math.max(0, column.cash + delta))
  update((draft) => ({ ...draft, [side]: { ...draft[side], cash } }))
}
</script>

<template>
  <section
    v-if="composer"
    class="panel-card flex max-h-full w-[30rem] max-w-full flex-col shadow-neon"
    role="dialog"
    aria-labelledby="trade-title"
    data-keep-presenting
    data-test="trade-composer"
  >
    <header class="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
      <div>
        <h2
          id="trade-title"
          class="text-lg font-bold"
        >
          Proposer un échange
        </h2>
        <p class="text-xs text-muted">
          {{ composer.remaining }} {{ composer.remaining > 1 ? 'propositions restantes' : 'proposition restante' }} pendant ce tour
        </p>
      </div>
      <button
        type="button"
        class="btn btn-ghost -mr-1 px-0"
        aria-label="Fermer sans proposer"
        title="Fermer"
        data-test="trade-close"
        @click="send({ kind: 'button', id: 'closeTrade' })"
      >
        <svg
          viewBox="0 0 24 24"
          class="h-5 w-5"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </header>

    <div
      class="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2"
      role="group"
      aria-label="Partenaire de l’échange"
    >
      <span class="text-xs font-semibold uppercase tracking-wider text-muted">Avec</span>
      <button
        v-for="partner in composer.partners"
        :key="partner"
        type="button"
        class="flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm font-semibold"
        :class="composer.draft.partner === partner ? 'border-neon bg-neon/10' : 'border-line hover:border-neon/60'"
        :aria-pressed="composer.draft.partner === partner"
        data-test="trade-partner"
        @click="choosePartner(partner)"
      >
        <span
          class="h-2.5 w-2.5 rounded-full"
          :style="{ background: player(partner)?.color }"
        />
        {{ player(partner)?.name }}
      </button>
    </div>

    <div class="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-y-auto px-4 py-3">
      <section
        v-for="{ key, title, column } in columns"
        :key="key"
        class="flex min-w-0 flex-col gap-2"
        :aria-label="title"
        :data-test="`${key}-column`"
      >
        <h3 class="text-xs font-semibold uppercase tracking-wider text-muted">
          {{ title }}
        </h3>
        <template v-if="column">
          <p
            v-if="column.squares.length === 0"
            class="text-xs text-muted"
          >
            Aucune case.
          </p>
          <button
            v-for="square in column.squares"
            :key="square.squareId"
            type="button"
            class="flex min-h-11 items-center gap-2 rounded-md border px-2 py-1 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50"
            :class="square.selected ? 'border-neon bg-neon/10' : 'border-line hover:border-neon/60'"
            :disabled="square.reason !== null"
            :aria-pressed="square.selected"
            :title="square.reason ?? undefined"
            data-test="trade-square"
            @click="toggleSquare(key, square.squareId)"
          >
            <span
              class="h-3 w-1.5 shrink-0 rounded-sm"
              :style="{ background: colorOf(square.squareId) }"
            />
            <span class="min-w-0 flex-1">
              <span class="block truncate">{{ squareById(square.squareId).name }}</span>
              <span
                v-if="square.reason || square.mortgaged"
                class="block text-[11px] text-muted"
              >{{ square.reason ?? 'en veille' }}</span>
            </span>
          </button>

          <div class="mt-1 flex flex-col gap-1">
            <span class="text-xs text-muted">PwnCoins</span>
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="btn btn-ghost px-0"
                :aria-label="`Retirer ${CASH_STEP} PwnCoins`"
                :disabled="column.cash === 0"
                :data-test="`${key}-cash-minus`"
                @click="changeCash(key, column, -CASH_STEP)"
              >
                −
              </button>
              <span
                class="min-w-0 flex-1 text-center tabular-nums"
                :data-test="`${key}-cash`"
              >{{ formatPwn(column.cash) }}</span>
              <button
                type="button"
                class="btn btn-ghost px-0"
                :aria-label="`Ajouter ${CASH_STEP} PwnCoins`"
                :disabled="column.cash >= column.maxCash"
                :data-test="`${key}-cash-plus`"
                @click="changeCash(key, column, CASH_STEP)"
              >
                +
              </button>
            </div>
          </div>

          <button
            v-for="cardKey in column.keys"
            :key="cardKey.cardId"
            type="button"
            class="flex min-h-11 items-center gap-2 rounded-md border px-2 text-left text-sm"
            :class="cardKey.selected ? 'border-neon bg-neon/10' : 'border-line hover:border-neon/60'"
            :aria-pressed="cardKey.selected"
            data-test="trade-key"
            @click="toggleKey(key, cardKey.cardId)"
          >
            Clé de déchiffrement
          </button>
        </template>
        <p
          v-else
          class="text-xs text-muted"
        >
          Choisissez d’abord un partenaire.
        </p>
      </section>
    </div>

    <footer class="flex flex-col gap-2 border-t border-line px-4 py-3">
      <p
        v-if="!composer.empty && !composer.check.allowed && composer.check.reason"
        class="text-xs text-loss"
        role="status"
      >
        {{ composer.check.reason }}
      </p>
      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="btn btn-ghost"
          @click="send({ kind: 'button', id: 'closeTrade' })"
        >
          Annuler
        </button>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="!composer.check.allowed"
          data-test="trade-propose"
          @click="send({ kind: 'button', id: 'proposeTrade' })"
        >
          Proposer
        </button>
      </div>
    </footer>
  </section>
</template>
