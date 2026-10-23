<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import Button from 'primevue/button';
import AppIcon from '@/components/AppIcon.vue';
import AppTable from '@/components/AppTable.vue';
import PageHeader from '@/components/PageHeader.vue';
import QueryState from '@/components/QueryState.vue';
import ScopeNotice from '@/components/ScopeNotice.vue';
import SearchToolbar from '@/components/SearchToolbar.vue';
import type { ColumnDef, FilterDef } from '@/components/types';
import { useScopedReports, type ScopedRow } from '@/composables/useScoped';
import { useSession } from '@/composables/useSession';
import { CHANNEL_OPTIONS, channelLabel, CLASSIFICATION_OPTIONS, classificationLabel, formatFolio } from '@/lib/catalogs';
import { formatDate } from '@/lib/format';
import type { CaseReport } from '@/types/api';

/**
 * Denuncias recibidas. La API entrega las denuncias solo por expediente; esta vista las reúne de los expedientes más recientes
 * y cada fila abre la pestaña de denuncias del expediente. Una denuncia nueva crea (o pertenece a) un expediente.
 */
const { can } = useSession();
const query = useScopedReports({ includeClosed: true });
const search = ref('');
const values = ref<Record<string, string | null>>({ channel: null, classification: null });
const filters: FilterDef[] = [{ field: 'channel', label: 'Canal', options: CHANNEL_OPTIONS }, { field: 'classification', label: 'Clasificación', options: CLASSIFICATION_OPTIONS }];
const columns: ColumnDef[] = [
  { field: 'receivedAt', header: 'Recepción', sortable: true }, { field: 'case', header: 'Expediente' }, { field: 'channelCode', header: 'Canal', minScreen: 'md' },
  { field: 'classificationCode', header: 'Clasificación', minScreen: 'sm' }, { field: 'factualDescription', header: 'Relato', minScreen: 'lg' }
];
type Row = ScopedRow<CaseReport> & { id: string; receivedAt: string; channelCode: string; classificationCode: string; factualDescription: string };
const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const rows = computed<Row[]>(() => (query.data.value?.rows ?? [])
  .map((row) => ({ ...row, id: row.item.id, receivedAt: row.item.receivedAt, channelCode: row.item.channelCode, classificationCode: row.item.classificationCode, factualDescription: row.item.factualDescription }))
  .filter((row) => (!values.value.channel || row.channelCode === values.value.channel) && (!values.value.classification || row.classificationCode === values.value.classification) &&
    (!search.value.trim() || normalize(`${formatFolio(row.case.folio)} ${row.case.title} ${row.factualDescription}`).includes(normalize(search.value.trim()))))
  .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)));
const rowTo = (row: Row) => ({ name: 'cases-detail', params: { id: row.case.id }, query: { tab: 'denuncias' } });
</script>

<template>
  <div>
    <PageHeader title="Denuncias" description="Denuncias recibidas en los expedientes a los que usted tiene acceso.">
      <template #actions>
        <RouterLink v-if="can('cases.create') && can('reports.create')" :to="{ name: 'complaints-new' }" custom>
          <template #default="{ navigate, href }"><Button as="a" :href="href" label="Registrar denuncia" @click="navigate"><template #icon><AppIcon name="plus" :size="16" /></template></Button></template>
        </RouterLink>
      </template>
    </PageHeader>
    <ScopeNotice v-if="query.data.value" :result="query.data.value" noun="Denuncias" />
    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Denuncias">
      <SearchToolbar v-model:search="search" v-model:values="values" :filters="filters" placeholder="Buscar por expediente o relato" :total="query.data.value ? rows.length : null" />
      <QueryState :data="query.data.value?.rows" :is-pending="query.isPending.value" :error="query.error.value" subject="las denuncias" empty-icon="megaphone" empty-title="No hay denuncias registradas" empty-description="Las denuncias que se registren en un expediente aparecerán aquí." @retry="query.refetch()">
        <template #default>
          <AppTable :rows="rows" :columns="columns" label="Denuncias" :row-to="rowTo" :detail-label="(row) => `Abrir ${formatFolio(row.case.folio)}`" :page-size="12">
            <template #cell-receivedAt="{ row }"><span class="whitespace-nowrap tabular-nums">{{ formatDate(row.receivedAt) }}</span></template>
            <template #cell-case="{ row }"><span class="block max-w-[14rem] truncate sm:max-w-xs"><span class="font-medium tabular-nums">{{ formatFolio(row.case.folio) }}</span> <span class="text-slate-600">{{ row.case.title }}</span></span></template>
            <template #cell-channelCode="{ row }">{{ channelLabel(row.channelCode) }}</template>
            <template #cell-classificationCode="{ row }">{{ classificationLabel(row.classificationCode) }}</template>
            <template #cell-factualDescription="{ row }"><span class="block max-w-sm truncate text-slate-600">{{ row.factualDescription }}</span></template>
            <template #empty><div class="px-6 py-10 text-center text-sm text-slate-600">Sin coincidencias. Ajuste la búsqueda o los filtros.</div></template>
          </AppTable>
        </template>
      </QueryState>
    </section>
  </div>
</template>
