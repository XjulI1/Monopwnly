<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { useInjectedGameSession } from '../../game/useGameSession'

const VISIBLE_MS = 4000

const { toast, dismissToast } = useInjectedGameSession()

let timer: ReturnType<typeof setTimeout> | null = null

watch(toast, (current) => {
  if (timer) clearTimeout(timer)
  if (current) timer = setTimeout(dismissToast, VISIBLE_MS)
})

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <button
    v-if="toast"
    :key="toast.id"
    type="button"
    class="flex min-h-11 max-w-md items-center gap-3 rounded-lg border bg-void/95 px-4 py-2 text-left text-sm shadow-lg"
    :class="toast.tone === 'error' ? 'border-loss/70' : 'border-neon/70'"
    role="status"
    data-keep-presenting
    data-test="toast"
    :data-tone="toast.tone"
    @click="dismissToast"
  >
    <span
      v-if="toast.tone === 'error'"
      class="font-bold text-loss"
    >!</span>
    <span>{{ toast.message }}</span>
  </button>
</template>
