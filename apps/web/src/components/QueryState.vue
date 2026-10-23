<script setup lang="ts" generic="T">
import { computed } from 'vue';
import EmptyState from './EmptyState.vue';
import ErrorState from './ErrorState.vue';
import LoadingState from './LoadingState.vue';

/**
 * Resuelve los cuatro estados de una consulta: cargando, error (o integración pendiente), vacío y con datos.
 * El slot por defecto recibe los datos ya tipados.
 */
const props = withDefaults(defineProps<{
  data: T | undefined; isPending: boolean; error: unknown; isEmpty?: (data: T) => boolean;
  emptyTitle?: string; emptyDescription?: string; emptyIcon?: string; subject?: string; compact?: boolean; rows?: number;
}>(), {
  isEmpty: (data: unknown) => Array.isArray(data) && data.length === 0, emptyTitle: 'Sin registros', emptyDescription: undefined,
  emptyIcon: 'folder', subject: undefined, compact: false, rows: 5
});
const emit = defineEmits<{ retry: [] }>();
const empty = computed(() => props.data !== undefined && props.isEmpty(props.data));
</script>

<template>
  <LoadingState v-if="isPending" :rows="rows" />
  <ErrorState v-else-if="error" :error="error" :compact="compact" :subject="subject" @retry="emit('retry')" />
  <EmptyState v-else-if="empty || data === undefined" :title="emptyTitle" :description="emptyDescription" :icon="emptyIcon" :compact="compact">
    <slot name="empty-actions" />
  </EmptyState>
  <slot v-else :data="data as T" />
</template>
