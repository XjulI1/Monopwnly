<script setup lang="ts">
import { computed, onMounted, useTemplateRef } from 'vue'
import { SCENE_COLORS } from '../../board/boardTheme'
import { cardById, type CardId } from '../../engine'

const props = defineProps<{ cardId: CardId }>()

const emit = defineEmits<{
  dismiss: []
}>()

const root = useTemplateRef<HTMLButtonElement>('root')

const card = computed(() => cardById(props.cardId))
const color = computed(() => (card.value.deck === 'exploit' ? SCENE_COLORS.exploit : SCENE_COLORS.patch))

onMounted(() => root.value?.focus())
</script>

<template>
  <button
    ref="root"
    type="button"
    class="card-reveal panel-card flex w-72 flex-col items-stretch gap-3 p-5 text-left"
    :style="{ borderColor: color, boxShadow: `0 0 0 1px ${color}, 0 0 40px ${color}55` }"
    data-keep-presenting
    data-test="card-reveal"
    @click="emit('dismiss')"
  >
    <span
      class="text-xs font-bold uppercase tracking-[0.25em]"
      :style="{ color }"
    >{{ card.deck === 'exploit' ? 'Exploit' : 'Patch' }}</span>
    <span class="text-xl font-bold leading-tight">{{ card.title }}</span>
    <span class="text-sm leading-relaxed text-ink/90">{{ card.text }}</span>
    <span class="mt-1 text-xs text-muted">Toucher pour continuer</span>
  </button>
</template>

<style scoped>
.card-reveal {
  animation: card-in 260ms ease-out;
}

@keyframes card-in {
  from {
    opacity: 0;
    transform: perspective(600px) rotateY(-70deg) scale(0.9);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .card-reveal {
    animation: none;
  }
}
</style>
