<script setup lang="ts">
import { computed, ref } from 'vue';
import Button from 'primevue/button';
import ApiErrorMessage from '@/components/ApiErrorMessage.vue';
import AppIcon from '@/components/AppIcon.vue';
import AppTable from '@/components/AppTable.vue';
import PageHeader from '@/components/PageHeader.vue';
import QueryState from '@/components/QueryState.vue';
import ScopeNotice from '@/components/ScopeNotice.vue';
import SearchToolbar from '@/components/SearchToolbar.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import type { ColumnDef, FilterDef } from '@/components/types';
import { useDirectory } from '@/composables/useDirectory';
import { useScopedDocuments, type ScopedRow } from '@/composables/useScoped';
import { formatFolio } from '@/lib/catalogs';
import { formatBytes, saveBlob } from '@/lib/download';
import { formatDateTime } from '@/lib/format';
import { optionsFrom } from '@/lib/status';
import { downloadDocument } from '@/services/caseOperations';
import type { CaseDocument } from '@/types/api';

/**
 * Documentos y evidencias de los expedientes revisados. La carga se hace dentro del expediente; aquí se consultan y descargan
 * por la API con la sesión (nunca existe una dirección pública del archivo).
 */
const { nameOf } = useDirectory();
const query = useScopedDocuments({ includeClosed: true });
const search = ref('');
const values = ref<Record<string, string | null>>({ kind: null });
const filters: FilterDef[] = [{ field: 'kind', label: 'Tipo', options: optionsFrom(['DOCUMENTO', 'EVIDENCIA']) }];
const columns: ColumnDef[] = [
  { field: 'originalFilename', header: 'Archivo', sortable: true }, { field: 'case', header: 'Expediente', minScreen: 'sm' }, { field: 'kind', header: 'Tipo', minScreen: 'md' },
  { field: 'sizeBytes', header: 'Tamaño', minScreen: 'lg' }, { field: 'uploadedByUserId', header: 'Cargado por', minScreen: 'xl' }, { field: 'createdAt', header: 'Fecha', minScreen: 'md', sortable: true }
];
type Row = ScopedRow<CaseDocument> & { id: string } & CaseDocument;
const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const rows = computed<Row[]>(() => (query.data.value?.rows ?? []).map((row) => ({ ...row.item, ...row, id: row.item.id }))
  .filter((row) => (!values.value.kind || row.kind === values.value.kind) && (!search.value.trim() || normalize(`${row.originalFilename} ${formatFolio(row.case.folio)} ${row.case.title}`).includes(normalize(search.value.trim()))))
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
const rowTo = (row: Row) => ({ name: 'cases-detail', params: { id: row.case.id }, query: { tab: 'documentos' } });
const downloading = ref<string | null>(null);
const downloadError = ref<unknown>(null);
async function download(row: Row) {
  downloading.value = row.id; downloadError.value = null;
  try { saveBlob(await downloadDocument(row.case.id, row.id), row.originalFilename); } catch (error) { downloadError.value = error; } finally { downloading.value = null; }
}
</script>

<template>
  <div>
    <PageHeader title="Documentos" description="Documentos y evidencias de los expedientes a los que usted tiene acceso. Se cargan dentro de cada expediente." />
    <ScopeNotice v-if="query.data.value" :result="query.data.value" noun="Documentos" />
    <ApiErrorMessage v-if="downloadError" class="mb-4" :error="downloadError" />
    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Documentos">
      <SearchToolbar v-model:search="search" v-model:values="values" :filters="filters" placeholder="Buscar por archivo o expediente" :total="query.data.value ? rows.length : null" />
      <QueryState :data="query.data.value?.rows" :is-pending="query.isPending.value" :error="query.error.value" subject="los documentos" empty-icon="file" empty-title="No hay documentos" empty-description="Los archivos que se carguen en un expediente aparecerán aquí." @retry="query.refetch()">
        <template #default>
          <AppTable :rows="rows" :columns="columns" label="Documentos" :row-to="rowTo" :detail-label="(row) => `Abrir documentos de ${formatFolio(row.case.folio)}`" :page-size="12">
            <template #cell-originalFilename="{ row }"><span class="block max-w-[14rem] truncate font-medium sm:max-w-xs" :title="row.originalFilename">{{ row.originalFilename }}</span></template>
            <template #cell-case="{ row }"><span class="tabular-nums">{{ formatFolio(row.case.folio) }}</span></template>
            <template #cell-kind="{ row }"><StatusBadge :status="row.kind" /></template>
            <template #cell-sizeBytes="{ row }"><span class="whitespace-nowrap tabular-nums">{{ formatBytes(row.sizeBytes) }}</span></template>
            <template #cell-uploadedByUserId="{ row }">{{ nameOf(row.uploadedByUserId, 'Persona no disponible') }}</template>
            <template #cell-createdAt="{ row }"><span class="whitespace-nowrap tabular-nums">{{ formatDateTime(row.createdAt) }}</span></template>
            <template #actions="{ row }">
              <Button size="small" severity="secondary" text :loading="downloading === row.id" :aria-label="`Descargar ${row.originalFilename}`" @click="download(row)"><template #icon><AppIcon name="download" :size="16" /></template></Button>
            </template>
            <template #empty><div class="px-6 py-10 text-center text-sm text-slate-600">Sin coincidencias. Ajuste la búsqueda o los filtros.</div></template>
          </AppTable>
        </template>
      </QueryState>
    </section>
  </div>
</template>
