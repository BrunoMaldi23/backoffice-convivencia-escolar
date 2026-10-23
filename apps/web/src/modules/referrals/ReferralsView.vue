<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import AppTable from '@/components/AppTable.vue';
import PageHeader from '@/components/PageHeader.vue';
import QueryState from '@/components/QueryState.vue';
import SearchToolbar from '@/components/SearchToolbar.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import type { ColumnDef, FilterDef } from '@/components/types';
import { useReferralsList } from '@/composables/useCaseActions';
import { formatFolio, referralTypeLabel } from '@/lib/catalogs';
import { formatDate } from '@/lib/format';
import { optionsFrom } from '@/lib/status';
import type { CaseReferral, ReferralStatus } from '@/types/api';

/**
 * Derivaciones de los expedientes a los que usted tiene acceso (`GET /referrals`, paginado por el servidor). Para registrarlas o
 * avanzarlas de estado se abre el expediente (pestaña Derivaciones).
 */
const PAGE_SIZE = 20;
const values = ref<Record<string, string | null>>({ status: null });
const page = ref(1);
watch(values, () => { page.value = 1; }, { deep: true });
const filters: FilterDef[] = [{ field: 'status', label: 'Estado', options: optionsFrom(['PENDIENTE', 'ENVIADA', 'CON_RESPUESTA', 'CERRADA']) }];
const params = computed(() => ({ page: page.value, limit: PAGE_SIZE, status: (values.value.status as ReferralStatus | null) ?? undefined }));
const query = useReferralsList(params);
const columns: ColumnDef[] = [
  { field: 'institutionName', header: 'Institución' }, { field: 'typeCode', header: 'Tipo', minScreen: 'md' }, { field: 'case', header: 'Expediente', minScreen: 'lg' },
  { field: 'createdAt', header: 'Registrada', minScreen: 'sm' }, { field: 'status', header: 'Estado' }
];
const rowTo = (r: CaseReferral) => ({ name: 'cases-detail', params: { id: r.caseId }, query: { tab: 'derivaciones' } });
</script>

<template>
  <div>
    <PageHeader title="Derivaciones" description="Casos derivados a instituciones de la red (salud, OPD, tribunales y otras) en los expedientes a los que tiene acceso." />
    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Derivaciones">
      <SearchToolbar v-model:values="values" :filters="filters" :total="query.data.value?.total ?? null" :searchable="false" />
      <QueryState :data="query.data.value?.items" :is-pending="query.isPending.value" :error="query.error.value" subject="las derivaciones" empty-icon="referral" empty-title="No hay derivaciones" empty-description="Las derivaciones se registran desde la pestaña «Derivaciones» de cada expediente." @retry="query.refetch()">
        <template #default="{ data }">
          <AppTable :rows="data" :columns="columns" label="Derivaciones" :total="query.data.value?.total" :page="page" :limit="PAGE_SIZE" :loading="query.isFetching.value" :row-to="rowTo" :detail-label="(r) => `Abrir expediente de la derivación a ${r.institutionName}`" @page="page = $event">
            <template #cell-institutionName="{ row }"><span class="font-medium">{{ row.institutionName }}</span></template>
            <template #cell-typeCode="{ row }">{{ referralTypeLabel(row.typeCode) }}</template>
            <template #cell-case="{ row }">{{ row.case ? `${formatFolio(row.case.folio)} · ${row.case.title}` : '—' }}</template>
            <template #cell-createdAt="{ row }"><span class="whitespace-nowrap tabular-nums">{{ formatDate(row.createdAt) }}</span></template>
            <template #cell-status="{ row }"><StatusBadge :status="row.status" /></template>
            <template #empty><div class="px-6 py-10 text-center text-sm text-slate-600">No hay derivaciones con ese estado.</div></template>
          </AppTable>
        </template>
      </QueryState>
    </section>
  </div>
</template>
