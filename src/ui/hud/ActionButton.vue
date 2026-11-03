<script setup lang="ts">
import { computed } from 'vue'
import { formatPwn, formatPwnDelta } from '../../game/format'
import type { ButtonId, ButtonView } from '../../game/interaction'

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

const amountText = computed(() => {
  const amount = props.button.amount
  if (amount === null) return null
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
      :class="`btn-${variant}`"
      :disabled="!button.enabled"
      :data-button="button.id"
      @click="emit('press', button.id)"
    >
      <span>{{ button.label }}</span>
      <span
        v-if="amountText"
        class="tabular-nums text-sm opacity-80"
      >{{ amountText }}</span>
    </button>
    <span
      v-if="showReason && !button.enabled && button.reason"
      class="text-xs leading-snug text-muted"
    >{{ button.reason }}</span>
  </span>
</template>
