<script setup lang="ts">
import { ref, watch } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import ApiErrorMessage from './ApiErrorMessage.vue';

/**
 * Confirmación para acciones sensibles (desactivar, revocar sesiones, etc.). Ejecuta `action` y solo se cierra si el servidor
 * confirma; ante un error muestra el motivo real dentro del diálogo y deja reintentar.
 */
const props = withDefaults(defineProps<{ header: string; message: string; confirmLabel: string; action: () => Promise<unknown>; danger?: boolean }>(), { danger: false });
const visible = defineModel<boolean>('visible', { default: false });
const emit = defineEmits<{ done: [] }>();
const running = ref(false);
const error = ref<unknown>(null);

watch(visible, (open) => { if (open) error.value = null; });

async function confirm() {
  if (running.value) return;
  running.value = true;
  error.value = null;
  try {
    await props.action();
    visible.value = false;
    emit('done');
  } catch (e) {
    error.value = e;
  } finally {
    running.value = false;
  }
}
</script>

<template>
  <Dialog v-model:visible="visible" :header="header" modal :draggable="false" :style="{ width: '32rem' }" :breakpoints="{ '640px': 'calc(100vw - 2rem)' }" :close-on-escape="!running">
    <p class="text-sm leading-relaxed text-slate-700">{{ message }}</p>
    <slot />
    <ApiErrorMessage v-if="error" class="mt-4" :error="error" />
    <template #footer>
      <Button label="Cancelar" severity="secondary" text :disabled="running" @click="visible = false" />
      <Button :label="confirmLabel" :severity="danger ? 'danger' : undefined" :loading="running" @click="confirm" />
    </template>
  </Dialog>
</template>
