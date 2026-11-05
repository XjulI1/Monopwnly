<script setup lang="ts">
import { shortcutName, type Shortcut } from '../../game/shortcuts'

defineProps<{ shortcut: Shortcut | null }>()
</script>

<template>
  <span
    v-if="shortcut"
    class="hidden font-normal opacity-70 pointer-fine:inline"
    aria-hidden="true"
    data-test="shortcut"
  > ({{ shortcutName(shortcut) }})</span>
</template>
