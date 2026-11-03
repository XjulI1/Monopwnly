<script setup lang="ts">
import { onMounted, ref } from 'vue'

withDefaults(
  defineProps<{
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    danger?: boolean
  }>(),
  { confirmLabel: 'Confirmer', cancelLabel: 'Annuler', danger: false },
)

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const cancelButton = ref<HTMLButtonElement | null>(null)

onMounted(() => cancelButton.value?.focus())
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-void/70 p-4 backdrop-blur-sm"
    data-keep-presenting
    @click.self="emit('cancel')"
    @keydown.esc="emit('cancel')"
  >
    <div
      class="panel-card w-full max-w-sm p-5 shadow-neon"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
    >
      <h2
        id="confirm-title"
        class="text-lg font-bold"
      >
        {{ title }}
      </h2>
      <p
        id="confirm-message"
        class="mt-2 text-sm text-muted"
      >
        {{ message }}
      </p>
      <div class="mt-5 flex justify-end gap-2">
        <button
          ref="cancelButton"
          type="button"
          class="btn btn-ghost"
          data-test="cancel"
          @click="emit('cancel')"
        >
          {{ cancelLabel }}
        </button>
        <button
          type="button"
          class="btn"
          :class="danger ? 'btn-danger' : 'btn-primary'"
          data-test="confirm"
          @click="emit('confirm')"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
