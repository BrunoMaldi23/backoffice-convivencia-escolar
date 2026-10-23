<script setup lang="ts">
import { ref, watch } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import PendingNotice from './PendingNotice.vue';

/**
 * Confirmación para acciones sensibles (desactivar, revocar, cambiar roles). Ejecuta `action` y muestra
 * el resultado real; si la acción falla o está pendiente de integración, el diálogo permanece abierto.
 */
const props = withDefaults(defineProps<{
  header: string; message: string; confirmLabel: string; action: () => Promise<unknown>; danger?: boolean; actionName?: string;
}>(), { danger: false, actionName: undefined });
const visible = defineModel<boolean>('visible', { default: false });
const emit = defineEmits<{ done: [] }>();
const running = ref(false);
const error = ref<unknown>(null);

watch(visible, (open) => { if (open) error.value = null; });

async function confirm() {
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
  <Dialog v-model:visible="visible" :header="header" modal :draggable="false" :style="{ width: '32rem' }" :breakpoints="{ '640px': 'calc(100vw - 2rem)' }">
    <p class="text-sm leading-relaxed text-slate-700">{{ message }}</p>
    <slot />
    <PendingNotice v-if="error" class="mt-4" :error="error" :action="actionName" />
    <template #footer>
      <Button label="Cancelar" severity="secondary" text @click="visible = false" />
      <Button :label="confirmLabel" :severity="danger ? 'danger' : undefined" :loading="running" @click="confirm" />
    </template>
  </Dialog>
</template>
