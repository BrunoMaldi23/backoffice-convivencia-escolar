<script setup lang="ts">
import { computed, ref, watch } from 'vue';
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
const props = defineProps<{ establishmentId: string }>();
const visible = defineModel<boolean>('visible', { default: false });
const emit = defineEmits<{ done: [result: ImportStudentsResult] }>();

const MAX_ROWS = 500;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const importer = useImportStudents();
const year = ref(new Date().getFullYear());
const parsed = ref<ParsedStudents | null>(null);
const fileName = ref('');
const fileError = ref<string | null>(null);
const result = ref<ImportStudentsResult | null>(null);

watch(visible, (open) => { if (open) { parsed.value = null; fileName.value = ''; fileError.value = null; result.value = null; importer.reset(); } });

async function onFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  parsed.value = null; fileError.value = null; result.value = null; importer.reset();
  if (!file) return;
  fileName.value = file.name;
  if (file.size > MAX_FILE_BYTES) { fileError.value = 'El archivo supera los 2 MB. Divídalo en partes.'; return; }
  if (!/\.(csv|txt)$/i.test(file.name)) { fileError.value = 'Use un archivo CSV. En Excel: Archivo → Guardar como → CSV.'; return; }
  parsed.value = parseStudentsCsv(await file.text());
  if (parsed.value.missingColumns.length) fileError.value = `Faltan columnas obligatorias: ${parsed.value.missingColumns.join(', ')}.`;
  else if (!parsed.value.rows.length) fileError.value = 'El archivo no tiene filas de estudiantes.';
  else if (parsed.value.rows.length > MAX_ROWS) fileError.value = `El archivo tiene ${parsed.value.rows.length} filas; el máximo por carga es ${MAX_ROWS}. Divídalo en partes.`;
}
const ready = computed(() => Boolean(parsed.value && !fileError.value && parsed.value.rows.length && !parsed.value.errors.length));
const downloadTemplate = () => saveBlob(new Blob(['﻿', STUDENTS_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' }), 'plantilla-estudiantes.csv');

async function submit() {
  if (!ready.value || !parsed.value) return;
  try {
    result.value = await importer.mutateAsync({ establishmentId: props.establishmentId, academicYear: year.value, rows: parsed.value.rows });
    emit('done', result.value);
  } catch { /* el error se muestra en el diálogo */ }
}
</script>

<template>
  <MutationDialog v-model:visible="visible" header="Importar estudiantes" :submit-label="result ? 'Listo' : 'Importar'" :pending="importer.isPending.value" :error="importer.error.value" :disabled="!result && !ready" width="40rem" @submit="result ? (visible = false) : submit()">
    <template v-if="!result">
      <p class="rounded-md bg-sky-50 px-3 py-2 text-sm leading-relaxed text-sky-900">Suba un archivo CSV con las columnas <strong>RUT</strong>, <strong>Nombres</strong> y <strong>Apellidos</strong> (y, si quiere, <strong>Fecha de nacimiento</strong> y <strong>Curso</strong>). Los estudiantes que ya existan se actualizan por RUT y los cursos que falten se crean.</p>
      <Button label="Descargar plantilla" size="small" severity="secondary" outlined type="button" @click="downloadTemplate"><template #icon><AppIcon name="download" :size="15" /></template></Button>
      <FormField id="im-year" label="Año académico de los cursos" required><template #default="{ id }"><InputNumber v-model="year" :input-id="id" :use-grouping="false" :min="2000" :max="2100" fluid /></template></FormField>
      <FormField id="im-file" label="Archivo CSV" required :error="fileError">
        <template #default="{ id, describedby }"><input :id="id" type="file" accept=".csv,.txt,text/csv" :aria-describedby="describedby" class="block w-full cursor-pointer rounded-md border border-slate-300 bg-white text-sm text-slate-700 file:mr-3 file:cursor-pointer file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-800" @change="onFile"></template>
      </FormField>
      <div v-if="parsed && !parsed.missingColumns.length" class="text-sm" aria-live="polite">
        <p class="font-medium text-slate-900">{{ fileName }}: {{ parsed.rows.length }} {{ parsed.rows.length === 1 ? 'fila' : 'filas' }} leídas.</p>
        <template v-if="parsed.errors.length">
          <p class="mt-2 font-medium text-red-700">Corrija estas filas y vuelva a subir el archivo:</p>
          <ul class="mt-1 max-h-40 list-disc space-y-0.5 overflow-auto pl-5 text-red-800">
            <li v-for="(error, index) in parsed.errors.slice(0, 30)" :key="index">Fila {{ error.row }}: {{ error.message }}</li>
          </ul>
          <p v-if="parsed.errors.length > 30" class="mt-1 text-xs text-slate-600">Y {{ parsed.errors.length - 30 }} errores más.</p>
        </template>
        <p v-else-if="!fileError" class="mt-1 flex items-center gap-1.5 text-emerald-800"><AppIcon name="check-circle" :size="15" />Sin errores. Listo para importar.</p>
      </div>
    </template>
    <div v-else class="space-y-1 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
      <p class="font-medium">Importación terminada.</p>
      <p>{{ result.created }} {{ result.created === 1 ? 'estudiante creado' : 'estudiantes creados' }}, {{ result.updated }} {{ result.updated === 1 ? 'actualizado' : 'actualizados' }}<template v-if="result.createdCourses">, {{ result.createdCourses }} {{ result.createdCourses === 1 ? 'curso nuevo' : 'cursos nuevos' }}</template>.</p>
    </div>
  </MutationDialog>
</template>
