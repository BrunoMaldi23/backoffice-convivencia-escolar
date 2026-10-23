<script setup lang="ts">
import { computed, ref } from 'vue';
import AppTable from '@/components/AppTable.vue';
import PageHeader from '@/components/PageHeader.vue';
import QueryState from '@/components/QueryState.vue';
import ScopeNotice from '@/components/ScopeNotice.vue';
import SearchToolbar from '@/components/SearchToolbar.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import type { ColumnDef, FilterDef } from '@/components/types';
import { useDirectory } from '@/composables/useDirectory';
import { useScopedMeasures, type ScopedRow } from '@/composables/useScoped';
import { formatFolio } from '@/lib/catalogs';
import { formatDate } from '@/lib/format';
import { isOverdueMeasure, isPendingMeasure } from '@/lib/metrics';
import { optionsFrom } from '@/lib/status';
import type { CaseMeasure } from '@/types/api';

/** Medidas de resguardo de todos los expedientes revisados. Cada fila abre la pestaña de medidas del expediente, donde se actualizan. */
const { nameOf } = useDirectory();
const query = useScopedMeasures({ includeClosed: true });
const now = new Date();
const search = ref('');
const values = ref<Record<string, string | null>>({ status: 'PENDIENTE', due: null });
const filters: FilterDef[] = [
  { field: 'status', label: 'Estado', options: optionsFrom(['PENDIENTE', 'COMPLETADA', 'CANCELADA']) },
  { field: 'due', label: 'Plazo', options: [{ value: 'overdue', label: 'Vencidas' }, { value: 'dated', label: 'Con plazo' }, { value: 'none', label: 'Sin plazo' }] }
];
const columns: ColumnDef[] = [
  { field: 'title', header: 'Medida', sortable: true }, { field: 'case', header: 'Expediente', minScreen: 'sm' }, { field: 'responsibles', header: 'Responsables', minScreen: 'lg' },
  { field: 'dueAt', header: 'Plazo', sortable: true }, { field: 'status', header: 'Estado' }
];
type Row = ScopedRow<CaseMeasure> & { id: string; title: string; dueAt: string | null; status: string };
const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const all = computed<Row[]>(() => (query.data.value?.rows ?? []).map((row) => ({ ...row, id: row.item.id, title: row.item.title, dueAt: row.item.dueAt, status: row.item.status })));
const rows = computed(() => all.value.filter((row) => {
  const due = values.value.due;
  return (!values.value.status || row.status === values.value.status) &&
    (!due || (due === 'overdue' ? isOverdueMeasure(row.item, now) : due === 'dated' ? Boolean(row.dueAt) : !row.dueAt)) &&
    (!search.value.trim() || normalize(`${row.title} ${formatFolio(row.case.folio)} ${row.case.title}`).includes(normalize(search.value.trim())));
}));
const counts = computed(() => [
  { label: 'Pendientes', value: all.value.filter((row) => isPendingMeasure(row.item)).length, cls: 'border-l-amber-500' },
  { label: 'Con plazo vencido', value: all.value.filter((row) => isOverdueMeasure(row.item, now)).length, cls: 'border-l-red-600' },
  { label: 'Cumplidas', value: all.value.filter((row) => row.status === 'COMPLETADA').length, cls: 'border-l-emerald-600' }
]);
const rowTo = (row: Row) => ({ name: 'cases-detail', params: { id: row.case.id }, query: { tab: 'medidas' } });
</script>

<template>
  <div>
    <PageHeader title="Medidas de resguardo" description="Medidas adoptadas en los expedientes a los que usted tiene acceso, con sus responsables y plazos." />
    <ScopeNotice v-if="query.data.value" :result="query.data.value" noun="Medidas" />
    <div v-if="query.data.value" class="mb-4 grid gap-3 sm:grid-cols-3">
      <div v-for="c in counts" :key="c.label" :class="['rounded-lg border border-l-4 border-slate-200 bg-white px-4 py-2.5', c.cls]">
        <p class="text-sm text-slate-600">{{ c.label }}</p><p class="mt-0.5 text-2xl font-semibold tabular-nums text-slate-900">{{ c.value }}</p>
      </div>
    </div>
    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Medidas de resguardo">
      <SearchToolbar v-model:search="search" v-model:values="values" :filters="filters" placeholder="Buscar por medida o expediente" :total="query.data.value ? rows.length : null" />
      <QueryState :data="query.data.value?.rows" :is-pending="query.isPending.value" :error="query.error.value" subject="las medidas" empty-icon="shield" empty-title="No hay medidas registradas" empty-description="Las medidas se registran dentro de cada expediente." @retry="query.refetch()">
        <template #default>
          <AppTable :rows="rows" :columns="columns" label="Medidas de resguardo" :row-to="rowTo" :detail-label="(row) => `Abrir medidas de ${formatFolio(row.case.folio)}`" :page-size="12">
            <template #cell-title="{ row }"><span class="block max-w-[14rem] truncate font-medium sm:max-w-xs" :title="row.title">{{ row.title }}</span></template>
            <template #cell-case="{ row }"><span class="tabular-nums">{{ formatFolio(row.case.folio) }}</span></template>
            <template #cell-responsibles="{ row }">{{ row.item.responsibles.length ? row.item.responsibles.map((r) => nameOf(r.userId)).join(', ') : 'Sin responsables' }}</template>
            <template #cell-dueAt="{ row }"><span :class="['whitespace-nowrap tabular-nums', isOverdueMeasure(row.item, now) ? 'font-semibold text-red-800' : '']">{{ row.dueAt ? formatDate(row.dueAt) : '—' }}<span v-if="isOverdueMeasure(row.item, now)" class="sr-only"> (vencida)</span></span></template>
            <template #cell-status="{ row }"><StatusBadge :status="row.status" /></template>
            <template #empty><div class="px-6 py-10 text-center text-sm text-slate-600">Sin coincidencias. Ajuste la búsqueda o los filtros.</div></template>
          </AppTable>
        </template>
      </QueryState>
    </section>
  </div>
</template>
