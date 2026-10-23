<script setup lang="ts">
import { computed, ref } from 'vue';
import AppTable from '@/components/AppTable.vue';
import PageHeader from '@/components/PageHeader.vue';
import QueryState from '@/components/QueryState.vue';
import ScopeNotice from '@/components/ScopeNotice.vue';
import SearchToolbar from '@/components/SearchToolbar.vue';
import type { ColumnDef, FilterDef } from '@/components/types';
import { useDirectory } from '@/composables/useDirectory';
import { useScopedFollowUps, type ScopedRow } from '@/composables/useScoped';
import { formatFolio } from '@/lib/catalogs';
import { formatDate, formatDateTime, isOverdue } from '@/lib/format';
import type { CaseFollowUp } from '@/types/api';

/** Seguimientos registrados en los expedientes revisados, con su próxima acción y plazo. Se registran dentro de cada expediente. */
const { nameOf } = useDirectory();
const query = useScopedFollowUps({ includeClosed: true });
const search = ref('');
const values = ref<Record<string, string | null>>({ next: null });
const filters: FilterDef[] = [{ field: 'next', label: 'Próxima acción', options: [{ value: 'overdue', label: 'Vencida' }, { value: 'pending', label: 'Con plazo vigente' }, { value: 'none', label: 'Sin próxima acción' }] }];
const columns: ColumnDef[] = [
  { field: 'occurredAt', header: 'Fecha y hora', sortable: true }, { field: 'case', header: 'Expediente' }, { field: 'note', header: 'Seguimiento', minScreen: 'md' },
  { field: 'createdByUserId', header: 'Registró', minScreen: 'xl' }, { field: 'nextAction', header: 'Próxima acción', minScreen: 'lg' }
];
type Row = ScopedRow<CaseFollowUp> & { id: string; occurredAt: string; note: string; createdByUserId: string; nextAction: string | null };
const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const rows = computed<Row[]>(() => (query.data.value?.rows ?? []).map((row) => ({ ...row, id: row.item.id, occurredAt: row.item.occurredAt, note: row.item.note, createdByUserId: row.item.createdByUserId, nextAction: row.item.nextAction }))
  .filter((row) => {
    const next = values.value.next;
    const due = row.item.nextActionDueAt;
    return (!next || (next === 'overdue' ? Boolean(due) && isOverdue(due) : next === 'pending' ? Boolean(due) && !isOverdue(due) : !row.nextAction)) &&
      (!search.value.trim() || normalize(`${row.note} ${formatFolio(row.case.folio)} ${row.case.title}`).includes(normalize(search.value.trim())));
  }).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)));
const rowTo = (row: Row) => ({ name: 'cases-detail', params: { id: row.case.id }, query: { tab: 'seguimientos' } });
</script>

<template>
  <div>
    <PageHeader title="Seguimientos" description="Seguimientos registrados en los expedientes a los que usted tiene acceso." />
    <ScopeNotice v-if="query.data.value" :result="query.data.value" noun="Seguimientos" />
    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Seguimientos">
      <SearchToolbar v-model:search="search" v-model:values="values" :filters="filters" placeholder="Buscar por seguimiento o expediente" :total="query.data.value ? rows.length : null" />
      <QueryState :data="query.data.value?.rows" :is-pending="query.isPending.value" :error="query.error.value" subject="los seguimientos" empty-icon="activity" empty-title="No hay seguimientos registrados" empty-description="Los seguimientos se registran dentro de cada expediente." @retry="query.refetch()">
        <template #default>
          <AppTable :rows="rows" :columns="columns" label="Seguimientos" :row-to="rowTo" :detail-label="(row) => `Abrir seguimientos de ${formatFolio(row.case.folio)}`" :page-size="12">
            <template #cell-occurredAt="{ row }"><span class="whitespace-nowrap tabular-nums">{{ formatDateTime(row.occurredAt) }}</span></template>
            <template #cell-case="{ row }"><span class="tabular-nums font-medium">{{ formatFolio(row.case.folio) }}</span></template>
            <template #cell-note="{ row }"><span class="block max-w-xs truncate text-slate-700">{{ row.note }}</span></template>
            <template #cell-createdByUserId="{ row }">{{ nameOf(row.createdByUserId, 'Persona no disponible') }}</template>
            <template #cell-nextAction="{ row }">
              <span v-if="row.nextAction" class="block max-w-xs truncate">{{ row.nextAction }}<span v-if="row.item.nextActionDueAt" :class="['ml-1 text-xs tabular-nums', isOverdue(row.item.nextActionDueAt) ? 'font-semibold text-red-800' : 'text-slate-500']">· {{ formatDate(row.item.nextActionDueAt) }}</span></span>
              <span v-else class="text-slate-500">—</span>
            </template>
            <template #empty><div class="px-6 py-10 text-center text-sm text-slate-600">Sin coincidencias. Ajuste la búsqueda o los filtros.</div></template>
          </AppTable>
        </template>
      </QueryState>
    </section>
  </div>
</template>
