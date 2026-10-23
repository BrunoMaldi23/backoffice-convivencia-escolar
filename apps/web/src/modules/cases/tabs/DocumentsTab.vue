<script setup lang="ts">
import { reactive, ref } from 'vue';
import Button from 'primevue/button';
import Select from 'primevue/select';
import ApiErrorMessage from '@/components/ApiErrorMessage.vue';
import AppIcon from '@/components/AppIcon.vue';
import AppTable from '@/components/AppTable.vue';
import FormField from '@/components/FormField.vue';
import MutationDialog from '@/components/MutationDialog.vue';
import QueryState from '@/components/QueryState.vue';
import SectionCard from '@/components/SectionCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import type { ColumnDef } from '@/components/types';
import { useDocuments, useUploadDocument } from '@/composables/useCaseContent';
import { useDirectory } from '@/composables/useDirectory';
import { useSession } from '@/composables/useSession';
import { formatDateTime } from '@/lib/format';
import { formatBytes, saveBlob } from '@/lib/download';
import { ClientValidationError } from '@/lib/errors';
import { ALLOWED_UPLOAD_TYPES, downloadDocument, MAX_UPLOAD_BYTES } from '@/services/caseOperations';
import type { CaseDocument, CaseRecord, DocumentKind } from '@/types/api';

/**
 * Documentos y evidencias del expediente. La carga es privada (el archivo viaja a la API y se guarda con una clave interna) y la
 * descarga siempre pasa por la API con la sesión; nunca hay una dirección pública. Se validan formato (PDF, JPG o PNG) y tamaño
 * (hasta 10 MB) antes de enviar. Un expediente cerrado debe reabrirse antes de cargar archivos (regla del servidor).
 */
const props = defineProps<{ caseRecord: CaseRecord }>();
const { can } = useSession();
const { nameOf } = useDirectory();
const query = useDocuments(() => props.caseRecord.id);
const upload = useUploadDocument(props.caseRecord.id);

const columns: ColumnDef[] = [
  { field: 'originalFilename', header: 'Archivo' }, { field: 'kind', header: 'Tipo', minScreen: 'sm' }, { field: 'sizeBytes', header: 'Tamaño', minScreen: 'md' },
  { field: 'uploadedByUserId', header: 'Cargado por', minScreen: 'lg' }, { field: 'createdAt', header: 'Fecha', minScreen: 'md' }
];
const open = ref(false);
const form = reactive({ kind: 'DOCUMENTO' as DocumentKind | null, file: null as File | null });
const fileError = ref<string | null>(null);
const localError = ref<unknown>(null);
const downloading = ref<string | null>(null);
const downloadError = ref<unknown>(null);
const input = ref<HTMLInputElement | null>(null);
const KINDS = [{ value: 'DOCUMENTO', label: 'Documento' }, { value: 'EVIDENCIA', label: 'Evidencia' }];

function openForm() { Object.assign(form, { kind: 'DOCUMENTO', file: null }); fileError.value = null; localError.value = null; upload.reset(); open.value = true; }
function onFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null;
  form.file = file; fileError.value = null; localError.value = null;
  if (!file) return;
  if (!(ALLOWED_UPLOAD_TYPES as readonly string[]).includes(file.type)) fileError.value = 'Formato no permitido. Suba un PDF, JPG o PNG.';
  else if (file.size === 0) fileError.value = 'El archivo está vacío.';
  else if (file.size > MAX_UPLOAD_BYTES) fileError.value = `El archivo pesa ${formatBytes(file.size)}; el máximo es 10 MB.`;
}
async function submit() {
  if (!form.file) fileError.value = 'Seleccione un archivo.';
  if (fileError.value || !form.file) return;
  localError.value = null;
  try { await upload.mutateAsync({ kind: form.kind!, file: form.file }); open.value = false; } catch (error) { localError.value = error instanceof ClientValidationError ? error : null; }
}
async function download(doc: CaseDocument) {
  downloading.value = doc.id; downloadError.value = null;
  try { saveBlob(await downloadDocument(props.caseRecord.id, doc.id), doc.originalFilename); } catch (error) { downloadError.value = error; } finally { downloading.value = null; }
}
</script>

<template>
  <SectionCard dense title="Documentos y evidencias" description="Archivos privados del expediente. Solo PDF, JPG o PNG de hasta 10 MB.">
    <template v-if="can('documents.create')" #actions>
      <Button label="Cargar archivo" size="small" :disabled="caseRecord.status === 'CERRADO'" :title="caseRecord.status === 'CERRADO' ? 'Reabra el expediente para cargar archivos' : undefined" @click="openForm">
        <template #icon><AppIcon name="paperclip" :size="15" /></template>
      </Button>
    </template>
    <p v-if="caseRecord.status === 'CERRADO'" class="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">El expediente está cerrado: reábralo para cargar archivos nuevos. Los existentes siguen disponibles.</p>
    <ApiErrorMessage v-if="downloadError" class="mb-3" :error="downloadError" />
    <QueryState :data="query.data.value" :is-pending="query.isPending.value" :error="query.error.value" compact empty-title="Sin documentos" empty-description="Cargue actas, informes o evidencias del caso." empty-icon="file" subject="los documentos" @retry="query.refetch()">
      <template #default="{ data }">
        <AppTable :rows="data" :columns="columns" label="Documentos del expediente" :page-size="8">
          <template #cell-originalFilename="{ row }"><span class="block max-w-[14rem] truncate font-medium text-slate-900 sm:max-w-xs" :title="row.originalFilename">{{ row.originalFilename }}</span></template>
          <template #cell-kind="{ row }"><StatusBadge :status="row.kind" /></template>
          <template #cell-sizeBytes="{ row }"><span class="whitespace-nowrap tabular-nums">{{ formatBytes(row.sizeBytes) }}</span></template>
          <template #cell-uploadedByUserId="{ row }">{{ nameOf(row.uploadedByUserId, 'Persona no disponible') }}</template>
          <template #cell-createdAt="{ row }"><span class="whitespace-nowrap tabular-nums">{{ formatDateTime(row.createdAt) }}</span></template>
          <template #actions="{ row }">
            <Button size="small" severity="secondary" text :loading="downloading === row.id" :aria-label="`Descargar ${row.originalFilename}`" @click="download(row)"><template #icon><AppIcon name="download" :size="16" /></template></Button>
          </template>
        </AppTable>
      </template>
    </QueryState>
  </SectionCard>

  <MutationDialog v-model:visible="open" header="Cargar archivo" submit-label="Cargar" :pending="upload.isPending.value" :error="upload.error.value ?? localError" :disabled="Boolean(fileError)" @submit="submit">
    <FormField id="dc-kind" label="Tipo" required>
      <template #default="{ id }"><Select v-model="form.kind" :input-id="id" :options="KINDS" option-label="label" option-value="value" class="w-full" /></template>
    </FormField>
    <FormField id="dc-file" label="Archivo" required :error="fileError" help="PDF, JPG o PNG, de hasta 10 MB. El contenido debe coincidir con el formato.">
      <template #default="{ id, invalid, describedby }">
        <input :id="id" ref="input" type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" :aria-invalid="invalid" :aria-describedby="describedby" class="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-sky-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-sky-800 hover:file:bg-sky-100" @change="onFile">
      </template>
    </FormField>
    <p v-if="upload.isPending.value" class="flex items-center gap-2 text-sm text-slate-600" role="status"><AppIcon name="clock" :size="15" />Cargando el archivo; no cierre esta ventana.</p>
  </MutationDialog>
</template>
