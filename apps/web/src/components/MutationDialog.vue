<script setup lang="ts">
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import ApiErrorMessage from './ApiErrorMessage.vue';

/**
 * Diálogo para formularios que escriben en la API. El error del servidor se muestra dentro del diálogo, que permanece abierto
 * hasta que la operación resulte exitosa. El botón principal se deshabilita mientras se envía para evitar duplicados.
 */
withDefaults(defineProps<{ header: string; submitLabel: string; pending?: boolean; error?: unknown; danger?: boolean; width?: string; disabled?: boolean }>(), { pending: false, error: undefined, danger: false, width: '34rem', disabled: false });
const visible = defineModel<boolean>('visible', { default: false });
const emit = defineEmits<{ submit: []; reload: [] }>();
</script>

<template>
  <Dialog v-model:visible="visible" :header="header" modal :draggable="false" :style="{ width }" :breakpoints="{ '768px': 'calc(100vw - 1.5rem)' }" :close-on-escape="!pending">
    <form class="space-y-4" novalidate @submit.prevent="emit('submit')">
      <slot />
      <ApiErrorMessage :error="error" @reload="emit('reload')" />
      <div class="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" label="Cancelar" severity="secondary" text :disabled="pending" @click="visible = false" />
        <Button type="submit" :label="submitLabel" :severity="danger ? 'danger' : undefined" :loading="pending" :disabled="disabled" />
      </div>
    </form>
  </Dialog>
</template>
