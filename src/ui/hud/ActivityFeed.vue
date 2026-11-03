<script setup lang="ts">
import { computed } from 'vue'
import { useInjectedGameSession } from '../../game/useGameSession'

const props = withDefaults(defineProps<{ size?: number }>(), { size: 5 })

const { feed } = useInjectedGameSession()

const lines = computed(() => feed.value.slice(-props.size))
</script>

<template>
  <ol
    class="flex min-h-[5.5rem] flex-col justify-end gap-0.5 text-xs"
    aria-live="polite"
    aria-label="Dernières actions"
    data-test="activity-feed"
  >
    <li
      v-for="(line, index) in lines"
      :key="line.id"
      class="px-1 leading-snug"
      :class="index === lines.length - 1 ? 'text-ink' : 'text-muted'"
    >
      {{ line.text }}
    </li>
  </ol>
</template>
