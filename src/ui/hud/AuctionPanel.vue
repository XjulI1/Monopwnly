<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { squareById } from '../../engine'
import { formatPwn } from '../../game/format'
import { bidCheck } from '../../game/interaction'
import { useInjectedGameSession } from '../../game/useGameSession'
import ActionButton from './ActionButton.vue'

const { view, displayedState, engineState, isPresenting, send } = useInjectedGameSession()

const draft = ref(0)

const auction = computed(() => view.value.auction)
const nameOf = (id: string | null) => displayedState.value.players.find((p) => p.id === id)?.name ?? ''
const colorOf = (id: string | null) => displayedState.value.players.find((p) => p.id === id)?.color ?? 'currentColor'
const passButton = computed(() => view.value.buttons.find((b) => b.id === 'pass') ?? null)
const contenders = computed(() => {
  const current = auction.value
  if (!current) return []
  return [
    ...current.bidders.map((id) => ({ id, withdrawn: false })),
    ...current.withdrawn.map((id) => ({ id, withdrawn: true })),
  ]
})
const check = computed(() => (isPresenting.value ? { allowed: false, reason: null } : bidCheck(engineState.value, draft.value)))

watch(
  () => [auction.value?.highBid, auction.value?.nextBidder, auction.value?.defaultBid] as const,
  () => {
    if (auction.value) draft.value = auction.value.defaultBid
  },
  { immediate: true },
)

function placeBid() {
  if (check.value.allowed) send({ kind: 'bid', amount: draft.value })
}
</script>

<template>
  <section
    v-if="auction"
    class="flex flex-col gap-3"
    aria-label="Enchère"
  >
    <header>
      <p class="text-xs font-semibold uppercase tracking-wider text-muted">
        Enchère
      </p>
      <h3 class="flex items-center justify-between gap-2 text-lg font-bold">
        {{ squareById(auction.squareId).name }}
        <button
          type="button"
          class="btn btn-ghost min-h-11 px-3 text-xs font-semibold"
          data-test="open-sheet"
          @click="send({ kind: 'square', index: squareById(auction.squareId).index })"
        >
          Fiche
        </button>
      </h3>
      <p class="text-sm">
        <template v-if="auction.highBidder">
          Meilleure mise : <span class="tabular-nums font-semibold">{{ formatPwn(auction.highBid) }} par {{ nameOf(auction.highBidder) }}</span>
        </template>
        <span
          v-else
          class="text-muted"
        >Aucune mise</span>
      </p>
    </header>

    <ul
      class="flex flex-wrap gap-1.5"
      aria-label="Joueurs en lice"
    >
      <li
        v-for="contender in contenders"
        :key="contender.id"
        data-test="bidder"
        :data-withdrawn="contender.withdrawn || undefined"
        class="flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm"
        :class="[
          contender.withdrawn ? 'border-line text-muted line-through' : 'border-line',
          contender.id === auction.nextBidder ? 'border-neon text-neon' : '',
        ]"
      >
        <span
          class="h-2 w-2 rounded-full"
          :style="{ background: colorOf(contender.id) }"
        />{{ nameOf(contender.id) }}
      </li>
    </ul>

    <p
      class="font-semibold"
      :style="{ color: colorOf(auction.nextBidder) }"
      data-test="next-bidder"
    >
      À {{ nameOf(auction.nextBidder) }} d’enchérir
    </p>

    <div class="flex flex-col gap-2">
      <label class="flex items-center gap-2 text-sm">
        <span class="shrink-0 text-muted">Mise</span>
        <input
          v-model.number="draft"
          type="number"
          inputmode="numeric"
          class="min-h-11 w-full rounded-md border border-line bg-void px-3 tabular-nums text-ink outline-none focus:border-neon"
          :min="auction.min"
          :max="auction.max"
          step="1"
          @keydown.enter.prevent="placeBid"
        >
      </label>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="shortcut in auction.shortcuts"
          :key="shortcut.label"
          type="button"
          class="btn btn-ghost px-2 tabular-nums"
          :data-shortcut="shortcut.label"
          :disabled="!shortcut.enabled || isPresenting"
          @click="draft = shortcut.amount"
        >
          {{ shortcut.label }}
        </button>
      </div>
      <p class="text-xs text-muted">
        Entre {{ formatPwn(auction.min) }} et {{ formatPwn(auction.max) }}
      </p>
      <div class="grid grid-cols-2 gap-2">
        <span :title="check.reason ?? undefined">
          <button
            type="button"
            class="btn btn-primary w-full"
            data-test="place-bid"
            :disabled="!check.allowed"
            @click="placeBid"
          >
            Enchérir
          </button>
        </span>
        <ActionButton
          v-if="passButton"
          :button="passButton"
          @press="send({ kind: 'button', id: 'pass' })"
        />
      </div>
    </div>
  </section>
</template>
