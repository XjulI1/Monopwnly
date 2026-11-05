<script setup lang="ts">
import { computed } from 'vue'
import { formatPwn, formatPwnDelta } from '../../game/format'
import type { ButtonId, ButtonView } from '../../game/interaction'
import ShortcutHint from './ShortcutHint.vue'

const props = withDefaults(
  defineProps<{
    button: ButtonView
    variant?: 'primary' | 'ghost' | 'danger'
    showReason?: boolean
  }>(),
  { variant: 'ghost', showReason: false },
)

const emit = defineEmits<{
  press: [id: ButtonId]
}>()

const RECEIVING: readonly ButtonId[] = ['sell', 'mortgage']

const stacked = computed(() => props.button.amount === null && props.button.detail !== null)

const amountText = computed(() => {
  const amount = props.button.amount
  if (amount === null) return props.button.detail
  return RECEIVING.includes(props.button.id) ? formatPwnDelta(amount) : formatPwn(amount)
})
</script>

<template>
  <span
    class="flex flex-col gap-1"
    :title="button.reason ?? undefined"
  >
    <button
      type="button"
      class="btn w-full"
      :class="[`btn-${variant}`, { 'flex-col gap-0 py-1': stacked }]"
      :disabled="!button.enabled"
      :data-button="button.id"
      :aria-keyshortcuts="button.shortcut ?? undefined"
      @click="emit('press', button.id)"
    >
      <span>{{ button.label }}<ShortcutHint :shortcut="button.shortcut" /></span>
      <span
        v-if="amountText"
        class="tabular-nums opacity-80"
        :class="stacked ? 'text-xs font-normal' : 'text-sm'"
      >{{ amountText }}</span>
    </button>
    <span
      v-if="showReason && !button.enabled && button.reason"
      class="text-xs leading-snug text-muted"
    >{{ button.reason }}</span>
  </span>
</template>
