<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Button from 'primevue/button';
import SelectButton from 'primevue/selectbutton';
import QueryState from '@/components/QueryState.vue';
import SectionCard from '@/components/SectionCard.vue';
import Timeline from '@/components/Timeline.vue';
import type { TimelineEntry } from '@/components/types';
import { useDirectory } from '@/composables/useDirectory';
import { useTimeline } from '@/composables/useCases';
import { eventLabel } from '@/lib/catalogs';
import { statusOf, type Tone } from '@/lib/status';
import type { CaseEvent, TimelineMode } from '@/types/api';

/** Línea de tiempo inmutable del expediente (`GET /cases/:id/timeline`). Se muestra primero lo más reciente. */
const props = defineProps<{ caseId: string }>();
const page = ref(1);
const mode = ref<TimelineMode>('relevant');
const query = useTimeline(() => props.caseId, page, 12, mode);
const { nameOf } = useDirectory();
const modeOptions = [{ label: 'Hitos relevantes', value: 'relevant' }, { label: 'Registro completo', value: 'all' }];
watch(mode, () => { page.value = 1; });

const tone = (type: string): Tone => (type.includes('CLOSED') || type.includes('RESOLVED') || type.includes('COMPLETED') || type.includes('FINALIZED') ? 'success' : type.includes('PAUSED') || type.includes('CORRECTED') || type.includes('REOPENED') || type.includes('VOIDED') ? 'warning' : type.includes('ASSIGNED') || type.includes('TRANSITIONED') || type.includes('STAGE') ? 'progress' : 'info');
function entry(event: CaseEvent): TimelineEntry {
  const change = event.previousStatus && event.newStatus && event.previousStatus !== event.newStatus ? `De ${statusOf(event.previousStatus).label.toLowerCase()} a ${statusOf(event.newStatus).label.toLowerCase()}.` : undefined;
  return { id: event.id, title: eventLabel(event.eventType), description: change, at: event.occurredAt, tone: tone(event.eventType), meta: nameOf(event.actorUserId, 'Sistema') };
}
const entries = computed(() => query.data.value?.items.map(entry));
const pages = computed(() => (query.data.value ? Math.max(1, Math.ceil(query.data.value.total / query.data.value.limit)) : 1));
const rangeLabel = computed(() => {
  if (!query.data.value?.total) return 'Sin eventos';
  const from = (page.value - 1) * query.data.value.limit + 1;
  const to = Math.min(page.value * query.data.value.limit, query.data.value.total);
  return `Mostrando ${from}–${to} de ${query.data.value.total} ${mode.value === 'relevant' ? 'hitos relevantes' : 'eventos'}`;
});
</script>

<template>
  <SectionCard dense title="Línea de tiempo" description="Hitos de gestión del expediente, ordenados desde la actividad más reciente.">
    <template #actions>
      <SelectButton v-model="mode" :options="modeOptions" option-label="label" option-value="value" :allow-empty="false" aria-label="Contenido de la línea de tiempo" />
    </template>
    <QueryState :data="entries" :is-pending="query.isPending.value" :error="query.error.value" compact empty-title="Sin eventos" empty-icon="history" subject="la línea de tiempo" @retry="query.refetch()">
      <template #default="{ data }">
        <p class="mb-4 text-xs tabular-nums text-slate-500">{{ rangeLabel }}</p>
        <Timeline :entries="data" compact />
      </template>
    </QueryState>
    <nav v-if="pages > 1" class="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm text-slate-600" aria-label="Paginación de la línea de tiempo">
      <Button label="Más recientes" size="small" severity="secondary" text :disabled="page <= 1" @click="page -= 1" />
      <span class="tabular-nums">Página {{ page }} de {{ pages }}</span>
      <Button label="Ver más antiguos" size="small" severity="secondary" text :disabled="page >= pages" @click="page += 1" />
    </nav>
  </SectionCard>
</template>
