<script setup lang="ts">
import { computed, ref } from 'vue';
import Button from 'primevue/button';
import Textarea from 'primevue/textarea';
import ApiErrorMessage from '@/components/ApiErrorMessage.vue';
import AppIcon from '@/components/AppIcon.vue';
import AppTable from '@/components/AppTable.vue';
import ConfirmActionDialog from '@/components/ConfirmActionDialog.vue';
import FormField from '@/components/FormField.vue';
import MutationDialog from '@/components/MutationDialog.vue';
import PageHeader from '@/components/PageHeader.vue';
import QueryState from '@/components/QueryState.vue';
import ScopeNotice from '@/components/ScopeNotice.vue';
import SearchToolbar from '@/components/SearchToolbar.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import type { ColumnDef, FilterDef } from '@/components/types';
import { caseScope, useApiMutation } from '@/composables/useApiMutation';
import { useDirectory } from '@/composables/useDirectory';
import { useScopedDocuments, type ScopedRow } from '@/composables/useScoped';
import { useSession } from '@/composables/useSession';
import { formatFolio } from '@/lib/catalogs';
import { formatBytes, saveBlob } from '@/lib/download';
import { formatDateTime } from '@/lib/format';
import { maxLength } from '@/lib/validation';
import { optionsFrom } from '@/lib/status';
import { deleteDocument, downloadDocument, voidDocument } from '@/services/caseOperations';
import type { CaseDocument } from '@/types/api';

/**
 * Documentos y evidencias de los expedientes revisados. La carga se hace dentro del expediente; aquí se consultan y descargan
 * por la API con la sesión (nunca existe una dirección pública del archivo). También se pueden anular (se conserva el antecedente con su
 * motivo) o eliminar definitivamente, siempre que el expediente esté abierto.
 */
const { nameOf } = useDirectory();
const { can } = useSession();
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
type DocumentAction = { caseId: string; id: string; expectedVersion: number };
const remove = useApiMutation((v: DocumentAction) => deleteDocument(v.caseId, v.id, v.expectedVersion), (_d, v) => caseScope(v.caseId));
const annul = useApiMutation((v: DocumentAction & { reason: string }) => voidDocument(v.caseId, v.id, { expectedVersion: v.expectedVersion, reason: v.reason }), (_d, v) => caseScope(v.caseId));
const deleteTarget = ref<Row | null>(null);
const deleteOpen = computed({ get: () => Boolean(deleteTarget.value), set: (value: boolean) => { if (!value) deleteTarget.value = null; } });
const voidTarget = ref<Row | null>(null);
const voidOpen = computed({ get: () => Boolean(voidTarget.value), set: (value: boolean) => { if (!value) voidTarget.value = null; } });
const voidReason = ref('');
const voidError = ref<string | null>(null);
const canAct = (row: Row) => can('documents.create') && row.case.status !== 'CERRADO';
function askVoid(row: Row) { voidTarget.value = row; voidReason.value = ''; voidError.value = null; annul.reset(); }
async function submitVoid() {
  voidError.value = voidReason.value.trim().length < 5 ? 'Indique el motivo de la anulación (al menos 5 caracteres).' : maxLength(1000)(voidReason.value);
  const row = voidTarget.value;
  if (voidError.value || !row) return;
  try { await annul.mutateAsync({ caseId: row.case.id, id: row.id, expectedVersion: row.version, reason: voidReason.value.trim() }); voidTarget.value = null; } catch { /* el error se muestra en el diálogo */ }
}
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
              <Button size="small" severity="secondary" text :loading="downloading === row.id" :aria-label="`Descargar ${row.originalFilename}`" :title="`Descargar ${row.originalFilename}`" @click="download(row)"><template #icon><AppIcon name="download" :size="17" /></template></Button>
              <template v-if="canAct(row)">
                <Button size="small" severity="secondary" text aria-label="Anular documento (se conserva en la trazabilidad)" title="Anular documento (se conserva en la trazabilidad)" @click="askVoid(row)"><template #icon><AppIcon name="ban" :size="16" /></template></Button>
                <Button size="small" severity="danger" text aria-label="Eliminar documento definitivamente" title="Eliminar documento definitivamente" @click="deleteTarget = row"><template #icon><AppIcon name="trash" :size="16" /></template></Button>
              </template>
            </template>
            <template #empty><div class="px-6 py-10 text-center text-sm text-slate-600">Sin coincidencias. Ajuste la búsqueda o los filtros.</div></template>
          </AppTable>
        </template>
      </QueryState>
    </section>
    <ConfirmActionDialog
      v-model:visible="deleteOpen" header="Eliminar documento" confirm-label="Eliminar definitivamente" danger
      :message="`Se eliminará definitivamente «${deleteTarget?.originalFilename ?? ''}» y, si es un archivo, se borrará su copia almacenada. Dejará de aparecer en el expediente y en su línea de tiempo; solo quedará la auditoría de seguridad. Si necesita conservar el antecedente, use «Anular».`"
      :action="() => remove.mutateAsync({ caseId: deleteTarget!.case.id, id: deleteTarget!.id, expectedVersion: deleteTarget!.version })"
    />
    <MutationDialog v-model:visible="voidOpen" header="Anular documento" submit-label="Anular registro" :pending="annul.isPending.value" :error="annul.error.value" @submit="submitVoid" @reload="query.refetch()">
      <p class="text-sm leading-relaxed text-slate-700">El documento dejará de aparecer en el expediente. La anulación y su motivo se conservarán en la trazabilidad.</p>
      <FormField id="dv-void-reason" label="Motivo de la anulación" required :error="voidError">
        <template #default="{ id, invalid, describedby }"><Textarea :id="id" v-model="voidReason" rows="3" auto-resize maxlength="1000" :invalid="invalid" :aria-describedby="describedby" class="w-full" /></template>
      </FormField>
    </MutationDialog>
  </div>
</template>
