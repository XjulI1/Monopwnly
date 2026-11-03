<script setup lang="ts">
const emit = defineEmits<{
  create: []
}>()
</script>

<template>
  <div class="relative flex h-full flex-col items-center justify-center gap-10 overflow-hidden p-6">
    <div
      class="grid-backdrop pointer-events-none absolute inset-0"
      aria-hidden="true"
    />
    <div class="relative flex flex-col items-center gap-3 text-center">
      <p class="font-mono text-sm tracking-[0.4em] text-patch">
        &gt; ./connect --target=board
      </p>
      <h1 class="neon-title text-6xl font-black">
        MONOPWNLY
      </h1>
      <p class="max-w-md text-muted">
        Piratez des systèmes, installez des backdoors et des rootkits, ruinez vos adversaires en PwnCoins.
      </p>
    </div>
    <button
      type="button"
      class="btn btn-primary relative px-8 text-lg"
      data-test="new-game"
      @click="emit('create')"
    >
      Nouvelle partie
    </button>
  </div>
</template>

<style scoped>
.grid-backdrop {
  background-image:
    linear-gradient(#19e3ff14 1px, transparent 1px),
    linear-gradient(90deg, #19e3ff14 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(circle at center, black 20%, transparent 75%);
}
</style>
