<script setup lang="ts">
import { computed, ref } from 'vue';
import SelectButton from 'primevue/selectbutton';
import EmptyState from '@/components/EmptyState.vue';
import ResourceListPage from '@/components/ResourceListPage.vue';
import SectionCard from '@/components/SectionCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import Timeline from '@/components/Timeline.vue';
import { useResource } from '@/composables/useResource';
import { formatDateTime } from '@/lib/format';
import { followUpColumns, followUpFilters } from './followups.config';

const VIEWS = [{ label: 'Listado', value: 'list' }, { label: 'Cronología', value: 'timeline' }];
const view = ref<'list' | 'timeline'>('list');
const query = useResource('followUps');
const now = new Date().toISOString();
const upcoming = computed(() => (query.data.value ?? []).filter((f) => f.status === 'programada' && f.scheduledAt >= now).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)).slice(0, 4));
const timeline = computed(() => [...(query.data.value ?? [])].sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)).map((f) => ({
  id: f.id, title: `${f.type}, ${f.caseFolio}`, at: f.scheduledAt, meta: f.responsible,
  tone: f.status === 'realizada' ? ('success' as const) : f.status === 'vencida' ? ('danger' as const) : ('info' as const)
})));
</script>

<template>
  <ResourceListPage
    v-if="view === 'list'" resource="followUps" title="Seguimientos" description="Revisiones periódicas de casos y medidas. Los vencidos requieren registro o reprogramación."
    :columns="followUpColumns" :filters="followUpFilters" :search-fields="['type', 'caseFolio', 'responsible']" search-placeholder="Buscar por caso o tipo"
    detail-route="followups-detail" subject="los seguimientos" empty-icon="activity" empty-title="No hay seguimientos programados"
  >
    <template #actions><SelectButton v-model="view" :options="VIEWS" option-label="label" option-value="value" :allow-empty="false" aria-label="Vista" /></template>
    <template #before>
      <SectionCard v-if="upcoming.length" title="Próximos seguimientos" flush class="mb-4">
        <ul class="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-4">
          <li v-for="f in upcoming" :key="f.id" class="px-5 py-3.5 sm:border-r sm:border-slate-100 last:border-r-0">
            <p class="text-xs tabular-nums text-slate-500">{{ formatDateTime(f.scheduledAt) }}</p>
            <p class="mt-1 text-sm font-medium text-slate-900">{{ f.type }}</p>
            <p class="text-xs tabular-nums text-slate-600">{{ f.caseFolio }}</p>
          </li>
        </ul>
      </SectionCard>
    </template>
  </ResourceListPage>

  <div v-else>
    <div class="mb-6 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem]">Seguimientos</h1>
        <p class="mt-1.5 text-[0.9375rem] text-slate-600">Cronología de seguimientos, del más reciente al más antiguo.</p>
      </div>
      <SelectButton v-model="view" :options="VIEWS" option-label="label" option-value="value" :allow-empty="false" aria-label="Vista" />
    </div>
    <SectionCard>
      <Timeline v-if="timeline.length" :entries="timeline" />
      <EmptyState v-else icon="activity" title="Sin seguimientos para mostrar" />
      <p class="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
        <StatusBadge status="realizada" /><StatusBadge status="programada" /><StatusBadge status="vencida" />
      </p>
    </SectionCard>
  </div>
</template>
