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
import { useScopedInterviews, type ScopedRow } from '@/composables/useScoped';
import { formatFolio, MODALITY_OPTIONS, modalityLabel } from '@/lib/catalogs';
import { formatDateTime } from '@/lib/format';
import { optionsFrom } from '@/lib/status';
import type { Interview } from '@/types/api';

/**
 * Entrevistas realizadas en los expedientes revisados. En el modelo de la API una entrevista es un registro de lo ocurrido
 * (borrador o finalizada); no existe una agenda de entrevistas programadas. Se abren en la pestaña del expediente.
 */
const { nameOf } = useDirectory();
const query = useScopedInterviews({ includeClosed: true });
const search = ref('');
const values = ref<Record<string, string | null>>({ status: null, modality: null });
const filters: FilterDef[] = [{ field: 'status', label: 'Estado', options: optionsFrom(['BORRADOR', 'FINALIZADA']) }, { field: 'modality', label: 'Modalidad', options: MODALITY_OPTIONS }];
const columns: ColumnDef[] = [
  { field: 'occurredAt', header: 'Fecha y hora', sortable: true }, { field: 'case', header: 'Expediente' }, { field: 'modalityCode', header: 'Modalidad', minScreen: 'md' },
  { field: 'interviewerUserId', header: 'Entrevistó', minScreen: 'lg' }, { field: 'status', header: 'Estado' }
];
type Row = ScopedRow<Interview> & { id: string; occurredAt: string; modalityCode: string; interviewerUserId: string; status: string };
const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const rows = computed<Row[]>(() => (query.data.value?.rows ?? []).map((row) => ({ ...row, id: row.item.id, occurredAt: row.item.occurredAt, modalityCode: row.item.modalityCode, interviewerUserId: row.item.interviewerUserId, status: row.item.status }))
  .filter((row) => (!values.value.status || row.status === values.value.status) && (!values.value.modality || row.modalityCode === values.value.modality) &&
    (!search.value.trim() || normalize(`${formatFolio(row.case.folio)} ${row.case.title}`).includes(normalize(search.value.trim()))))
  .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)));
const rowTo = (row: Row) => ({ name: 'cases-detail', params: { id: row.case.id }, query: { tab: 'entrevistas' } });
</script>

<template>
  <div>
    <PageHeader title="Entrevistas" description="Entrevistas registradas en los expedientes a los que usted tiene acceso." />
    <ScopeNotice v-if="query.data.value" :result="query.data.value" noun="Entrevistas" />
    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Entrevistas">
      <SearchToolbar v-model:search="search" v-model:values="values" :filters="filters" placeholder="Buscar por expediente" :total="query.data.value ? rows.length : null" />
      <QueryState :data="query.data.value?.rows" :is-pending="query.isPending.value" :error="query.error.value" subject="las entrevistas" empty-icon="message" empty-title="No hay entrevistas registradas" empty-description="Las entrevistas se registran dentro de cada expediente." @retry="query.refetch()">
        <template #default>
          <AppTable :rows="rows" :columns="columns" label="Entrevistas" :row-to="rowTo" :detail-label="(row) => `Abrir entrevistas de ${formatFolio(row.case.folio)}`" :page-size="12">
            <template #cell-occurredAt="{ row }"><span class="whitespace-nowrap tabular-nums">{{ formatDateTime(row.occurredAt) }}</span></template>
            <template #cell-case="{ row }"><span class="block max-w-[14rem] truncate sm:max-w-xs"><span class="font-medium tabular-nums">{{ formatFolio(row.case.folio) }}</span> <span class="text-slate-600">{{ row.case.title }}</span></span></template>
            <template #cell-modalityCode="{ row }">{{ modalityLabel(row.modalityCode) }}</template>
            <template #cell-interviewerUserId="{ row }">{{ nameOf(row.interviewerUserId, 'Persona no disponible') }}</template>
            <template #cell-status="{ row }"><StatusBadge :status="row.status" /></template>
            <template #empty><div class="px-6 py-10 text-center text-sm text-slate-600">Sin coincidencias. Ajuste la búsqueda o los filtros.</div></template>
          </AppTable>
        </template>
      </QueryState>
    </section>
  </div>
</template>
