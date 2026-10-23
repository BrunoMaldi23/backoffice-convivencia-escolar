<script setup lang="ts">
import { computed } from 'vue';
import ResourceListPage from '@/components/ResourceListPage.vue';
import { useResource } from '@/composables/useResource';
import { measureColumns, measureFilters } from './measures.config';

const query = useResource('measures');
const counts = computed(() => {
  const list = query.data.value ?? [];
  return [
    { label: 'Vigentes', value: list.filter((m) => m.status === 'vigente').length, cls: 'border-l-emerald-600' },
    { label: 'Pendientes de implementar', value: list.filter((m) => m.status === 'pendiente').length, cls: 'border-l-amber-500' },
    { label: 'Vencidas sin evaluación', value: list.filter((m) => m.status === 'vencida').length, cls: 'border-l-red-600' }
  ];
});
</script>

<template>
  <ResourceListPage
    resource="measures" title="Medidas de resguardo" description="Medidas adoptadas para proteger a estudiantes involucrados en casos de convivencia."
    :columns="measureColumns" :filters="measureFilters" :search-fields="['folio', 'type', 'caseFolio', 'responsible']" search-placeholder="Buscar por folio, medida o caso"
    detail-route="measures-detail" :create="{ to: { name: 'measures-new' }, label: 'Nueva medida' }" subject="las medidas" empty-icon="shield" empty-title="No hay medidas registradas"
  >
    <template v-if="query.data.value" #before>
      <div class="mb-4 grid gap-3 sm:grid-cols-3">
        <div v-for="c in counts" :key="c.label" :class="['rounded-lg border border-l-4 border-slate-200 bg-white px-4 py-3', c.cls]">
          <p class="text-sm text-slate-600">{{ c.label }}</p>
          <p class="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{{ c.value }}</p>
        </div>
      </div>
    </template>
  </ResourceListPage>
</template>
