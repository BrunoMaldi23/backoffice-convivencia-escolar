<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';
import { describeError, isIntegrationPending } from '@/lib/errors';
import AppIcon from './AppIcon.vue';

/**
 * Error de consulta. Distingue "integración pendiente" (estado esperado del desarrollo, sin acción del usuario)
 * de un error real (con botón para reintentar).
 */
const props = withDefaults(defineProps<{ error: unknown; compact?: boolean; subject?: string }>(), { compact: false, subject: 'la información' });
const emit = defineEmits<{ retry: [] }>();
const pending = computed(() => isIntegrationPending(props.error));
const endpoint = computed(() => (isIntegrationPending(props.error) ? props.error.endpoint : null));
</script>

<template>
  <div :class="['flex flex-col items-center text-center', compact ? 'px-4 py-8' : 'px-6 py-14']" role="status">
    <span :class="['flex h-11 w-11 items-center justify-center rounded-full', pending ? 'bg-sky-50 text-sky-700' : 'bg-red-50 text-red-700']">
      <AppIcon :name="pending ? 'clock' : 'alert-circle'" :size="20" />
    </span>
    <template v-if="pending">
      <p class="mt-4 font-semibold text-slate-900">Integración pendiente</p>
      <p class="mt-1 max-w-md text-sm leading-relaxed text-slate-600">
        Esta sección mostrará {{ subject }} cuando se conecte con el servidor. No se muestran ni se guardan datos mientras tanto.
      </p>
      <p class="mt-3 rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
        {{ endpoint ? `Servicio previsto: ${endpoint}` : 'Servicio aún no definido por el backend' }}
      </p>
    </template>
    <template v-else>
      <p class="mt-4 font-semibold text-slate-900">No se pudo cargar {{ subject }}</p>
      <p class="mt-1 max-w-md text-sm leading-relaxed text-slate-600">{{ describeError(error) }}</p>
      <Button class="mt-5" label="Reintentar" severity="secondary" outlined size="small" @click="emit('retry')" />
    </template>
  </div>
</template>
