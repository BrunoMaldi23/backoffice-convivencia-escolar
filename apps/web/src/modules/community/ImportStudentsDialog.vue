<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import * as XLSX from 'xlsx';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import AppIcon from '@/components/AppIcon.vue';
import FormField from '@/components/FormField.vue';
import MutationDialog from '@/components/MutationDialog.vue';
import { useImportStudents } from '@/composables/useCommunity';
import { parseStudentsCsv, STUDENTS_CSV_TEMPLATE, type ParsedStudents } from '@/lib/csv';
import { saveBlob } from '@/lib/download';
import type { ImportStudentsResult } from '@/types/api';

/**
 * Carga masiva de estudiantes desde un archivo CSV (`POST /students/import`). El archivo se lee en el navegador, se revisa fila por
 * fila y solo se envía si no tiene errores. La carga es "todo o nada": el servidor vuelve a validar y no escribe nada si hay un error.
 */
const visible = defineModel<boolean>('visible', { default: false });
const emit = defineEmits<{ done: [result: ImportStudentsResult] }>();

const BATCH_SIZE = 200;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const importer = useImportStudents();
const year = ref(new Date().getFullYear());
const parsed = ref<ParsedStudents | null>(null);
const fileName = ref('');
const fileError = ref<string | null>(null);
const result = ref<ImportStudentsResult | null>(null);
const completedBatches = ref(0);

watch(visible, (open) => { if (open) { parsed.value = null; fileName.value = ''; fileError.value = null; result.value = null; completedBatches.value = 0; importer.reset(); } });

async function onFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  parsed.value = null; fileError.value = null; result.value = null; importer.reset();
  if (!file) return;
  fileName.value = file.name;
  if (file.size > MAX_FILE_BYTES) { fileError.value = 'El archivo supera los 2 MB. Divídalo en partes.'; return; }
  if (!/\.(csv|txt|xlsx|xls)$/i.test(file.name)) { fileError.value = 'Use un archivo Excel (.xlsx, .xls) o CSV.'; return; }
  let text: string;
  if (/\.(xlsx|xls)$/i.test(file.name)) {
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const firstSheet = workbook.SheetNames[0];
      if (!firstSheet) { fileError.value = 'El libro Excel no contiene una hoja para importar.'; return; }
      text = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheet]!, { FS: ';', RS: '\n' });
    } catch { fileError.value = 'No se pudo leer el archivo Excel. Revise que no esté protegido y vuelva a guardarlo.'; return; }
  } else text = await file.text();
  parsed.value = parseStudentsCsv(text);
  if (parsed.value.missingColumns.length) fileError.value = `Faltan columnas obligatorias: ${parsed.value.missingColumns.join(', ')}.`;
  else if (!parsed.value.rows.length) fileError.value = 'El archivo no tiene filas de estudiantes.';
}
const ready = computed(() => Boolean(parsed.value && !fileError.value && parsed.value.rows.length && !parsed.value.errors.length));
const batchCount = computed(() => parsed.value ? Math.ceil(parsed.value.rows.length / BATCH_SIZE) : 0);
const downloadTemplate = () => saveBlob(new Blob(['﻿', STUDENTS_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' }), 'plantilla-estudiantes.csv');

async function submit() {
  if (!ready.value || !parsed.value) return;
  try {
    const total: ImportStudentsResult = { created: 0, updated: 0, createdCourses: 0, guardiansCreated: 0, guardiansUpdated: 0, linksCreated: 0 };
    completedBatches.value = 0;
    for (let index = 0; index < parsed.value.rows.length; index += BATCH_SIZE) {
      const partial = await importer.mutateAsync({ academicYear: year.value, rows: parsed.value.rows.slice(index, index + BATCH_SIZE) });
      total.created += partial.created; total.updated += partial.updated; total.createdCourses += partial.createdCourses;
      total.guardiansCreated += partial.guardiansCreated; total.guardiansUpdated += partial.guardiansUpdated; total.linksCreated += partial.linksCreated;
      completedBatches.value += 1;
    }
    result.value = total;
    emit('done', result.value);
  } catch { /* el error se muestra en el diálogo */ }
}
</script>

<template>
  <MutationDialog v-model:visible="visible" header="Importar estudiantes" :submit-label="result ? 'Listo' : 'Importar'" :pending="importer.isPending.value" :error="importer.error.value" :disabled="!result && !ready" width="40rem" @submit="result ? (visible = false) : submit()">
    <template v-if="!result">
      <p class="rounded-md bg-sky-50 px-3 py-2 text-sm leading-relaxed text-sky-900">Suba el CSV exportado desde su Excel con la plantilla institucional. Se incorporan estudiante, madre, padre y apoderado/a; se vinculan por RUN y el apoderado/a queda como principal. Las personas con RUN existente se actualizan, sin duplicarlas.</p>
      <Button label="Descargar plantilla" size="small" severity="secondary" outlined type="button" @click="downloadTemplate"><template #icon><AppIcon name="download" :size="15" /></template></Button>
      <FormField id="im-year" label="Año académico de los cursos" required><template #default="{ id }"><InputNumber v-model="year" :input-id="id" :use-grouping="false" :min="2000" :max="2100" fluid /></template></FormField>
      <FormField id="im-file" label="Archivo Excel o CSV" required :error="fileError">
        <template #default="{ id, describedby }"><input :id="id" type="file" accept=".xlsx,.xls,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" :aria-describedby="describedby" class="block w-full cursor-pointer rounded-md border border-slate-300 bg-white text-sm text-slate-700 file:mr-3 file:cursor-pointer file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-800" @change="onFile"></template>
      </FormField>
      <div v-if="parsed && !parsed.missingColumns.length" class="text-sm" aria-live="polite">
        <p class="font-medium text-slate-900">{{ fileName }}: {{ parsed.rows.length }} {{ parsed.rows.length === 1 ? 'fila' : 'filas' }} leídas.</p>
        <p v-if="batchCount > 1" class="mt-1 text-slate-600">Se procesará en {{ batchCount }} lotes de hasta {{ BATCH_SIZE }} filas. La validación se realiza antes de iniciar la carga.</p>
        <template v-if="parsed.errors.length">
          <p class="mt-2 font-medium text-red-700">Corrija estas filas y vuelva a subir el archivo:</p>
          <ul class="mt-1 max-h-40 list-disc space-y-0.5 overflow-auto pl-5 text-red-800">
            <li v-for="(error, index) in parsed.errors.slice(0, 30)" :key="index">Fila {{ error.row }}: {{ error.message }}</li>
          </ul>
          <p v-if="parsed.errors.length > 30" class="mt-1 text-xs text-slate-600">Y {{ parsed.errors.length - 30 }} errores más.</p>
        </template>
        <template v-else-if="parsed.warnings.length">
          <p class="mt-2 font-medium text-amber-800">Se importarán las filas válidas con estas observaciones:</p>
          <ul class="mt-1 max-h-40 list-disc space-y-0.5 overflow-auto pl-5 text-amber-900">
            <li v-for="(warning, index) in parsed.warnings.slice(0, 30)" :key="index">Fila {{ warning.row }}: {{ warning.message }}</li>
          </ul>
          <p v-if="parsed.warnings.length > 30" class="mt-1 text-xs text-slate-600">Y {{ parsed.warnings.length - 30 }} observaciones más.</p>
        </template>
        <p v-else-if="!fileError" class="mt-1 flex items-center gap-1.5 text-emerald-800"><AppIcon name="check-circle" :size="15" />Sin errores. Listo para importar.</p>
      </div>
    </template>
    <div v-else class="space-y-1 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
      <p class="font-medium">Importación terminada.</p>
      <p>{{ result.created }} {{ result.created === 1 ? 'estudiante creado' : 'estudiantes creados' }}, {{ result.updated }} {{ result.updated === 1 ? 'actualizado' : 'actualizados' }}<template v-if="result.createdCourses">, {{ result.createdCourses }} {{ result.createdCourses === 1 ? 'curso nuevo' : 'cursos nuevos' }}</template>.</p>
      <p>{{ result.guardiansCreated }} {{ result.guardiansCreated === 1 ? 'apoderado/a creado/a' : 'apoderados/as creados/as' }}, {{ result.guardiansUpdated }} {{ result.guardiansUpdated === 1 ? 'apoderado/a actualizado/a' : 'apoderados/as actualizados/as' }} y {{ result.linksCreated }} {{ result.linksCreated === 1 ? 'vínculo creado' : 'vínculos creados' }}.</p>
      <p v-if="completedBatches > 1">Se completaron {{ completedBatches }} lotes.</p>
      <p v-if="parsed?.skippedRows" class="font-medium text-amber-900">Se omitieron {{ parsed.skippedRows }} {{ parsed.skippedRows === 1 ? 'fila' : 'filas' }} de estudiante por datos obligatorios inválidos.</p>
    </div>
  </MutationDialog>
</template>
