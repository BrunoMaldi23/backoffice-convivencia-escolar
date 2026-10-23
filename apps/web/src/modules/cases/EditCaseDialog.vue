<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import DatePicker from 'primevue/datepicker';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import FormField from '@/components/FormField.vue';
import MutationDialog from '@/components/MutationDialog.vue';
import { useUpdateCase } from '@/composables/useCases';
import { CATEGORY_OPTIONS } from '@/lib/catalogs';
import { dateToIso, isoToDate } from '@/lib/format';
import { priorityOptions } from '@/lib/status';
import { maxLength, minLength, required, validateAll } from '@/lib/validation';
import type { CaseRecord, UpdateCaseInput } from '@/types/api';

/** Edita datos administrativos (`PATCH /cases/:id`). Envía solo lo que cambió, con `expectedVersion`; ante un 409 permite recargar. */
const props = defineProps<{ caseRecord: CaseRecord }>();
const visible = defineModel<boolean>('visible', { default: false });
const emit = defineEmits<{ reload: [] }>();
const update = useUpdateCase(props.caseRecord.id);

const form = reactive({ title: '', category: '' as string | null, priority: '' as string | null, receivedAt: null as Date | null, nextAction: '', nextActionDueAt: null as Date | null });
const errors = ref<Record<string, string>>({});
const today = new Date();

function load() {
  const c = props.caseRecord;
  Object.assign(form, { title: c.title, category: c.categoryCode, priority: c.priority, receivedAt: isoToDate(c.receivedAt), nextAction: c.nextAction ?? '', nextActionDueAt: isoToDate(c.nextActionDueAt) });
  errors.value = {};
  update.reset();
}
watch(visible, (open) => { if (open) load(); });
watch(() => props.caseRecord.version, load);

async function submit() {
  errors.value = validateAll(form, { title: [required('Escriba un título.'), minLength(3), maxLength(180)], category: [required('Seleccione una categoría.')], priority: [required('Seleccione la prioridad.')], receivedAt: [required('Indique la fecha.')], nextAction: [maxLength(500)] }) as Record<string, string>;
  if (Object.keys(errors.value).length) return;
  const c = props.caseRecord;
  const input: UpdateCaseInput = { expectedVersion: c.version };
  if (form.title.trim() !== c.title) input.title = form.title.trim();
  if (form.category !== c.categoryCode) input.categoryCode = form.category!;
  if (form.priority !== c.priority) input.priority = form.priority!;
  if (form.receivedAt && dateToIso(form.receivedAt) !== c.receivedAt && form.receivedAt.toDateString() !== new Date(c.receivedAt).toDateString()) input.receivedAt = dateToIso(form.receivedAt);
  if ((form.nextAction.trim() || null) !== c.nextAction) input.nextAction = form.nextAction.trim() || null;
  const due = form.nextActionDueAt ? dateToIso(form.nextActionDueAt) : null;
  if ((due ? new Date(due).toDateString() : null) !== (c.nextActionDueAt ? new Date(c.nextActionDueAt).toDateString() : null)) input.nextActionDueAt = due;
  if (Object.keys(input).length === 1) { visible.value = false; return; }
  try { await update.mutateAsync(input); visible.value = false; } catch { /* el error se muestra en el diálogo */ }
}
</script>

<template>
  <MutationDialog v-model:visible="visible" header="Editar caso" submit-label="Guardar cambios" :pending="update.isPending.value" :error="update.error.value" @submit="submit" @reload="emit('reload')">
    <FormField id="ec-title" label="Título" required :error="errors.title">
      <template #default="{ id, invalid, describedby }"><InputText :id="id" v-model="form.title" maxlength="180" :invalid="invalid" :aria-describedby="describedby" class="w-full" /></template>
    </FormField>
    <div class="grid gap-4 sm:grid-cols-2">
      <FormField id="ec-category" label="Categoría" required :error="errors.category">
        <template #default="{ id, invalid }"><Select v-model="form.category" :input-id="id" :options="CATEGORY_OPTIONS" option-label="label" option-value="value" :invalid="invalid" class="w-full" /></template>
      </FormField>
      <FormField id="ec-priority" label="Prioridad" required :error="errors.priority">
        <template #default="{ id, invalid }"><Select v-model="form.priority" :input-id="id" :options="priorityOptions" option-label="label" option-value="value" :invalid="invalid" class="w-full" /></template>
      </FormField>
      <FormField id="ec-received" label="Fecha de recepción" required :error="errors.receivedAt">
        <template #default="{ id, invalid }"><DatePicker v-model="form.receivedAt" :input-id="id" date-format="dd-mm-yy" :max-date="today" :invalid="invalid" show-icon icon-display="input" class="w-full" /></template>
      </FormField>
    </div>
    <FormField id="ec-next" label="Próxima acción" :error="errors.nextAction">
      <template #default="{ id, invalid }"><InputText :id="id" v-model="form.nextAction" maxlength="500" :invalid="invalid" class="w-full" /></template>
    </FormField>
    <FormField id="ec-due" label="Plazo de la próxima acción" help="Déjelo vacío para quitar el plazo.">
      <template #default="{ id }"><DatePicker v-model="form.nextActionDueAt" :input-id="id" date-format="dd-mm-yy" show-icon icon-display="input" show-button-bar class="w-full" /></template>
    </FormField>
  </MutationDialog>
</template>
