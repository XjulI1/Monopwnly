<script setup lang="ts">
import { computed } from 'vue'
import { FAMILY_COLORS } from '../../board/boardTheme'
import { FAMILY_NAMES, purchasableById, squareById, type SquareId, type TradeSide } from '../../engine'
import { formatPwn } from '../../game/format'
import { countOf, offerText } from '../../game/history/format'
import type { ButtonId } from '../../game/interaction'
import { useInjectedGameSession } from '../../game/useGameSession'
import ActionButton from './ActionButton.vue'

type Item = { key: string; label: string; detail: string | null; color: string }

const NEUTRAL = 'var(--color-muted)'

const { view, displayedState, send } = useInjectedGameSession()

const offer = computed(() => (view.value.thinking || view.value.trade ? null : view.value.offer))
const nameOf = (id: string) => displayedState.value.players.find((p) => p.id === id)?.name ?? ''
const title = computed(() => {
  const current = offer.value
  if (!current) return ''
  return view.value.original ? `${nameOf(current.from)} vous fait une contre-proposition` : `${nameOf(current.from)} vous propose un échange`
})
const reminder = computed(() => {
  const original = view.value.original
  return original ? `Votre offre : ${offerText(original, (id) => displayedState.value.ownership[id]?.mortgaged ?? false)}` : null
})

function familyOf(squareId: SquareId): string {
  const square = purchasableById(squareId)
  if (square?.kind === 'system') return FAMILY_NAMES[square.family]
  return square?.kind === 'node' ? 'Nœud' : 'Service'
}

function colorOf(squareId: SquareId): string {
  const square = purchasableById(squareId)
  return square?.kind === 'system' ? FAMILY_COLORS[square.family] : NEUTRAL
}

function itemsOf(side: TradeSide): Item[] {
  const squares = side.squares.map((id) => ({
    key: id,
    label: squareById(id).name,
    detail: `${familyOf(id)}${displayedState.value.ownership[id]?.mortgaged ? ' · en veille' : ''}`,
    color: colorOf(id),
  }))
  const cash = side.cash > 0 ? [{ key: 'cash', label: formatPwn(side.cash), detail: null, color: NEUTRAL }] : []
  const keys =
    side.keys.length > 0
      ? [{ key: 'keys', label: countOf(side.keys.length, 'Clé de déchiffrement', 'Clés de déchiffrement'), detail: null, color: NEUTRAL }]
      : []
  return [...squares, ...cash, ...keys]
}

const columns = computed(() => {
  const current = offer.value
  if (!current) return []
  return [
    { key: 'receive', title: 'Vous recevez', items: itemsOf(current.give) },
    { key: 'give', title: 'Vous donnez', items: itemsOf(current.receive) },
  ]
})

function press(id: ButtonId) {
  send({ kind: 'button', id })
}
</script>

<template>
  <div
    v-if="offer"
    class="panel-card flex w-full max-w-md flex-col gap-4 p-5 shadow-neon"
    role="dialog"
    aria-modal="true"
    aria-labelledby="trade-offer-title"
    data-keep-presenting
    data-test="trade-offer"
  >
    <header>
      <h2
        id="trade-offer-title"
        class="text-lg font-bold"
      >
        {{ title }}
      </h2>
      <p
        class="text-sm text-muted"
        data-test="trade-recipient"
      >
        Pour {{ nameOf(offer.to) }}
      </p>
      <p
        v-if="reminder"
        class="mt-2 text-sm"
        data-test="offer-original"
      >
        {{ reminder }}
      </p>
    </header>

    <div class="grid grid-cols-2 gap-4">
      <section
        v-for="column in columns"
        :key="column.key"
        :aria-label="column.title"
        :data-test="`offer-${column.key}`"
      >
        <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
          {{ column.title }}
        </h3>
        <ul class="flex flex-col gap-1.5 text-sm">
          <li
            v-for="item in column.items"
            :key="item.key"
            class="flex items-start gap-2"
          >
            <span
              class="mt-1 h-3 w-1.5 shrink-0 rounded-sm"
              :style="{ background: item.color }"
            />
            <span class="min-w-0">
              <span class="block">{{ item.label }}</span>
              <span
                v-if="item.detail"
                class="block text-[11px] text-muted"
              >{{ item.detail }}</span>
            </span>
          </li>
          <li
            v-if="column.items.length === 0"
            class="text-muted"
          >
            Rien
          </li>
        </ul>
      </section>
    </div>

    <div class="flex gap-2 whitespace-nowrap">
      <ActionButton
        v-for="button in view.buttons"
        :key="button.id"
        class="flex-1"
        :button="button"
        :variant="button.id === 'acceptTrade' ? 'primary' : 'ghost'"
        show-reason
        @press="press"
      />
    </div>
  </div>
</template>
