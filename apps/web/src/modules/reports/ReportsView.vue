<script setup lang="ts">
import { computed, ref } from 'vue';
import Button from 'primevue/button';
import DatePicker from 'primevue/datepicker';
import Select from 'primevue/select';
import AppIcon from '@/components/AppIcon.vue';
import BarChart from '@/components/BarChart.vue';
import FormField from '@/components/FormField.vue';
import PageHeader from '@/components/PageHeader.vue';
import QueryState from '@/components/QueryState.vue';
import SectionCard from '@/components/SectionCard.vue';
import { useAllCases } from '@/composables/useCases';
import { CATEGORY_OPTIONS, categoryLabel } from '@/lib/catalogs';
import { formatNumber } from '@/lib/format';
import { casesByMonth, computeCaseMetrics } from '@/lib/metrics';
import { priorityOf, statusOf } from '@/lib/status';

/**
 * Reportes calculados con los expedientes autorizados (la API no tiene endpoints de estadísticas ni de exportación). Los filtros de
 * período y categoría se aplican sobre la fecha de recepción; los resultados corresponden solo a los expedientes consultados.
 */
const query = useAllCases();
const range = ref<(Date | null)[] | null>(null);
const category = ref<string | null>(null);

const filtered = computed(() => {
  const [from, to] = range.value ?? [];
  return (query.data.value?.items ?? []).filter((c) => {
    const at = new Date(c.receivedAt).getTime();
    return (!from || at >= from.getTime()) && (!to || at <= to.getTime() + 86_399_999) && (!category.value || c.categoryCode === category.value);
  });
});
const metrics = computed(() => computeCaseMetrics(filtered.value));
const tally = (key: (c: (typeof filtered.value)[number]) => string, label: (code: string) => string) => {
  const counts = new Map<string, number>();
  for (const c of filtered.value) counts.set(key(c), (counts.get(key(c)) ?? 0) + 1);
  return [...counts].map(([code, value]) => ({ label: label(code), value })).sort((a, b) => b.value - a.value);
};
const byStatus = computed(() => Object.entries(metrics.value.byStatus).map(([code, value]) => ({ label: statusOf(code).label, value })));
const byCategory = computed(() => tally((c) => c.categoryCode, categoryLabel));
const byPriority = computed(() => tally((c) => c.priority, (code) => priorityOf(code).label));
const byMonth = computed(() => casesByMonth(filtered.value));
const summary = computed(() => [
  ['Expedientes en el período', filtered.value.length], ['Activos', metrics.value.active.length], ['Cerrados', metrics.value.closed],
  ['Activos con prioridad crítica', metrics.value.critical.length], ['Activos con la próxima acción vencida', metrics.value.overdueActions.length]
] as const);
</script>

<template>
  <div>
    <PageHeader title="Reportes" description="Indicadores de convivencia escolar calculados con los expedientes a los que usted tiene acceso.">
      <template #actions>
        <Button label="Exportar" severity="secondary" outlined disabled title="La API todavía no ofrece exportación"><template #icon><AppIcon name="download" :size="16" /></template></Button>
      </template>
    </PageHeader>

    <div class="mb-4 grid gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-[18rem_16rem_1fr] lg:items-end">
      <FormField id="rep-periodo" label="Período de recepción">
        <template #default="{ id }"><DatePicker v-model="range" :input-id="id" selection-mode="range" date-format="dd-mm-yy" placeholder="Todo el historial" show-icon icon-display="input" show-button-bar class="w-full" /></template>
      </FormField>
      <FormField id="rep-categoria" label="Categoría">
        <template #default="{ id }"><Select v-model="category" :input-id="id" :options="CATEGORY_OPTIONS" option-label="label" option-value="value" placeholder="Todas" show-clear class="w-full" /></template>
      </FormField>
      <p class="text-xs leading-relaxed text-slate-500">La exportación requiere un endpoint del servidor que aún no existe. Los datos se calculan en el navegador con los expedientes consultados<span v-if="query.data.value?.truncated"> ({{ query.data.value.items.length }} de {{ query.data.value.total }})</span>.</p>
    </div>

    <QueryState :data="query.data.value?.items" :is-pending="query.isPending.value" :error="query.error.value" subject="los reportes" empty-icon="chart" empty-title="Aún no hay expedientes" empty-description="Los reportes se calculan a partir de los expedientes registrados." @retry="query.refetch()">
      <template #default>
        <div class="grid gap-4 lg:grid-cols-2">
          <SectionCard dense title="Resumen del período" flush class="lg:col-span-2">
            <table class="w-full text-sm">
              <caption class="sr-only">Resumen de indicadores del período</caption>
              <tbody>
                <tr v-for="[label, value] in summary" :key="label" class="border-b border-slate-100 last:border-0"><th scope="row" class="px-4 py-2 text-left font-normal text-slate-700">{{ label }}</th><td class="px-4 py-2 text-right tabular-nums text-slate-900">{{ formatNumber(value) }}</td></tr>
              </tbody>
            </table>
          </SectionCard>
          <SectionCard dense title="Expedientes por estado"><BarChart :data="byStatus" title="Expedientes por estado" horizontal /></SectionCard>
          <SectionCard dense title="Expedientes por mes de recepción"><BarChart :data="byMonth" title="Expedientes recibidos" height-class="h-32" /></SectionCard>
          <SectionCard dense title="Por categoría"><BarChart v-if="byCategory.length" :data="byCategory" title="Expedientes por categoría" horizontal /><p v-else class="text-sm text-slate-600">Sin expedientes en el período.</p></SectionCard>
          <SectionCard dense title="Por prioridad"><BarChart v-if="byPriority.length" :data="byPriority" title="Expedientes por prioridad" horizontal /><p v-else class="text-sm text-slate-600">Sin expedientes en el período.</p></SectionCard>
        </div>
      </template>
    </QueryState>
  </div>
</template>
