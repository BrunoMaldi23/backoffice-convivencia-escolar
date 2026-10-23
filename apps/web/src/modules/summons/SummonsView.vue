<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import AppTable from '@/components/AppTable.vue';
import PageHeader from '@/components/PageHeader.vue';
import QueryState from '@/components/QueryState.vue';
import SearchToolbar from '@/components/SearchToolbar.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import type { ColumnDef, FilterDef } from '@/components/types';
import { useSummonsList } from '@/composables/useCaseActions';
import { formatFolio } from '@/lib/catalogs';
import { formatDateTime } from '@/lib/format';
import { optionsFrom } from '@/lib/status';
import type { CaseSummons, SummonsStatus } from '@/types/api';

/**
 * Citaciones de los expedientes a los que usted tiene acceso (`GET /summons`, paginado por el servidor). Para programar o cerrar
 * una citación se abre el expediente (pestaña Citaciones).
 */
const PAGE_SIZE = 20;
const values = ref<Record<string, string | null>>({ status: 'PROGRAMADA' });
const page = ref(1);
watch(values, () => { page.value = 1; }, { deep: true });
const filters: FilterDef[] = [{ field: 'status', label: 'Estado', options: optionsFrom(['PROGRAMADA', 'REALIZADA', 'NO_ASISTIO', 'CANCELADA']) }];
const params = computed(() => ({ page: page.value, limit: PAGE_SIZE, status: (values.value.status as SummonsStatus | null) ?? undefined }));
const query = useSummonsList(params);
const columns: ColumnDef[] = [
  { field: 'recipientLabel', header: 'Persona citada' }, { field: 'scheduledAt', header: 'Fecha y hora' }, { field: 'case', header: 'Expediente', minScreen: 'md' }, { field: 'location', header: 'Lugar', minScreen: 'lg' }, { field: 'status', header: 'Estado' }
];
const rowTo = (s: CaseSummons) => ({ name: 'cases-detail', params: { id: s.caseId }, query: { tab: 'citaciones' } });
const late = (s: CaseSummons) => s.status === 'PROGRAMADA' && new Date(s.scheduledAt).getTime() < Date.now();
</script>

<template>
  <div>
    <PageHeader title="Citaciones" description="Reuniones convocadas en los expedientes a los que tiene acceso, de la más próxima a la más lejana." />
    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Citaciones">
      <SearchToolbar v-model:values="values" :filters="filters" :total="query.data.value?.total ?? null" :searchable="false" />
      <QueryState :data="query.data.value?.items" :is-pending="query.isPending.value" :error="query.error.value" subject="las citaciones" empty-icon="mail" empty-title="No hay citaciones" empty-description="Las citaciones se programan desde la pestaña «Citaciones» de cada expediente." @retry="query.refetch()">
        <template #default="{ data }">
          <AppTable :rows="data" :columns="columns" label="Citaciones" :total="query.data.value?.total" :page="page" :limit="PAGE_SIZE" :loading="query.isFetching.value" :row-to="rowTo" :detail-label="(s) => `Abrir expediente de ${s.recipientLabel}`" @page="page = $event">
            <template #cell-recipientLabel="{ row }"><span class="font-medium">{{ row.recipientLabel }}</span></template>
            <template #cell-scheduledAt="{ row }"><span :class="['whitespace-nowrap tabular-nums', late(row) ? 'font-semibold text-red-800' : '']">{{ formatDateTime(row.scheduledAt) }}</span></template>
            <template #cell-case="{ row }">{{ row.case ? `${formatFolio(row.case.folio)} · ${row.case.title}` : '—' }}</template>
            <template #cell-status="{ row }"><StatusBadge :status="row.status" /></template>
            <template #empty><div class="px-6 py-10 text-center text-sm text-slate-600">No hay citaciones con ese estado.</div></template>
          </AppTable>
        </template>
      </QueryState>
    </section>
  </div>
</template>
