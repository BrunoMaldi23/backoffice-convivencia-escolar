<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import Button from 'primevue/button';
import DatePicker from 'primevue/datepicker';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import AppIcon from '@/components/AppIcon.vue';
import ConfirmActionDialog from '@/components/ConfirmActionDialog.vue';
import FormField from '@/components/FormField.vue';
import MutationDialog from '@/components/MutationDialog.vue';
import QueryState from '@/components/QueryState.vue';
import SectionCard from '@/components/SectionCard.vue';
import { useCreateReport, useDeleteReport, useReports, useUpdateReport, useVoidReport } from '@/composables/useCaseContent';
import { useSession } from '@/composables/useSession';
import { CHANNEL_OPTIONS, channelLabel, CLASSIFICATION_OPTIONS, classificationLabel } from '@/lib/catalogs';
import { dateToIso, formatDate, isoToDate } from '@/lib/format';
import { maxLength, minLength, required, validateAll } from '@/lib/validation';
import type { CaseReport } from '@/types/api';

/** Denuncias del expediente: listado, registro (`POST`) y modificación con control de versión (`PATCH`). */
const props = defineProps<{ caseId: string }>();
const { can } = useSession();
const query = useReports(() => props.caseId);
const create = useCreateReport(props.caseId);
const update = useUpdateReport(props.caseId);
const voidRecord = useVoidReport(props.caseId);
const deleteRecord = useDeleteReport(props.caseId);
const deleteTarget = ref<CaseReport | null>(null);
const deleteOpen = computed({ get: () => Boolean(deleteTarget.value), set: (value: boolean) => { if (!value) deleteTarget.value = null; } });

const open = ref(false);
const editing = ref<CaseReport | null>(null);
const today = new Date();
const form = reactive({ receivedAt: today as Date | null, channel: 'DIRECTO' as string | null, classification: 'SIN_CLASIFICAR' as string | null, factual: '', background: '' });
const errors = ref<Record<string, string>>({});
const voidOpen = ref(false);
const voidTarget = ref<CaseReport | null>(null);
const voidReason = ref('');
const voidError = ref<string | null>(null);
const mutation = () => (editing.value ? update : create);

function openForm(report: CaseReport | null) {
  editing.value = report;
  Object.assign(form, report
    ? { receivedAt: isoToDate(report.receivedAt), channel: report.channelCode, classification: report.classificationCode, factual: report.factualDescription, background: report.background ?? '' }
    : { receivedAt: new Date(), channel: 'DIRECTO', classification: 'SIN_CLASIFICAR', factual: '', background: '' });
  errors.value = {};
  create.reset(); update.reset();
  open.value = true;
}

async function submit() {
  errors.value = validateAll(form, { receivedAt: [required('Indique la fecha de recepción.')], channel: [required('Seleccione el canal.')], classification: [required('Seleccione la clasificación.')], factual: [required('Describa los hechos informados.'), minLength(3), maxLength(4000)], background: [maxLength(4000)] }) as Record<string, string>;
  if (Object.keys(errors.value).length) return;
  try {
    if (editing.value) await update.mutateAsync({ id: editing.value.id, expectedVersion: editing.value.version, channelCode: form.channel!, classificationCode: form.classification!, factualDescription: form.factual.trim(), background: form.background.trim() || null });
    else await create.mutateAsync({ receivedAt: dateToIso(form.receivedAt!), channelCode: form.channel!, classificationCode: form.classification!, factualDescription: form.factual.trim(), ...(form.background.trim() ? { background: form.background.trim() } : {}) });
    open.value = false;
  } catch { /* el error se muestra en el diálogo */ }
}
function askVoid(report: CaseReport) { voidTarget.value = report; voidReason.value = ''; voidError.value = null; voidRecord.reset(); voidOpen.value = true; }
async function submitVoid() {
  voidError.value = voidReason.value.trim().length < 5 ? 'Indique el motivo de la anulación (al menos 5 caracteres).' : maxLength(1000)(voidReason.value);
  if (voidError.value || !voidTarget.value) return;
  try { await voidRecord.mutateAsync({ id: voidTarget.value.id, expectedVersion: voidTarget.value.version, reason: voidReason.value.trim() }); voidOpen.value = false; } catch { /* el error se muestra en el diálogo */ }
}
</script>

<template>
  <SectionCard dense title="Denuncias" description="Registro interno de lo informado sobre este expediente.">
    <template v-if="can('reports.create')" #actions>
      <Button label="Registrar denuncia" size="small" @click="openForm(null)"><template #icon><AppIcon name="plus" :size="15" /></template></Button>
    </template>
    <QueryState :data="query.data.value" :is-pending="query.isPending.value" :error="query.error.value" compact empty-title="Sin denuncias registradas" empty-description="Cuando se registre una denuncia para este expediente, aparecerá aquí." empty-icon="megaphone" subject="las denuncias" @retry="query.refetch()">
      <template #default="{ data }">
        <ul class="space-y-4">
          <li v-for="report in data" :key="report.id" class="rounded-lg border border-slate-200 p-4">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <p class="text-sm font-semibold text-slate-900">Recibida el {{ formatDate(report.receivedAt) }}</p>
              <div class="flex items-center gap-1">
                <Button v-if="can('reports.update')" size="small" severity="secondary" text :aria-label="`Editar denuncia del ${formatDate(report.receivedAt)}`" title="Editar denuncia" @click="openForm(report)"><template #icon><AppIcon name="pencil" :size="16" /></template></Button>
                <Button v-if="can('reports.update')" size="small" severity="secondary" text :aria-label="`Anular denuncia del ${formatDate(report.receivedAt)}`" title="Anular denuncia (se conserva en la trazabilidad)" @click="askVoid(report)"><template #icon><AppIcon name="ban" :size="16" /></template></Button>
                <Button v-if="can('reports.update')" size="small" severity="danger" text :aria-label="`Eliminar definitivamente la denuncia del ${formatDate(report.receivedAt)}`" title="Eliminar definitivamente" @click="deleteTarget = report"><template #icon><AppIcon name="trash" :size="16" /></template></Button>
              </div>
            </div>
            <p class="mt-1 text-xs text-slate-500">{{ channelLabel(report.channelCode) }} · {{ classificationLabel(report.classificationCode) }}</p>
            <p class="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-800">{{ report.factualDescription }}</p>
            <p v-if="report.background" class="mt-3 whitespace-pre-line border-l-2 border-slate-200 pl-3 text-sm leading-relaxed text-slate-600"><span class="block text-xs font-medium text-slate-500">Antecedentes</span>{{ report.background }}</p>
          </li>
        </ul>
      </template>
    </QueryState>
  </SectionCard>

  <MutationDialog v-model:visible="open" :header="editing ? 'Editar denuncia' : 'Registrar denuncia'" :submit-label="editing ? 'Guardar cambios' : 'Registrar denuncia'" :pending="mutation().isPending.value" :error="mutation().error.value" @submit="submit" @reload="query.refetch()">
    <div class="grid gap-4 sm:grid-cols-2">
      <FormField id="rp-received" label="Fecha de recepción" required :error="errors.receivedAt" :help="editing ? 'La fecha de recepción no se puede modificar.' : undefined">
        <template #default="{ id, invalid }"><DatePicker v-model="form.receivedAt" :input-id="id" date-format="dd-mm-yy" :max-date="today" :disabled="Boolean(editing)" :invalid="invalid" show-icon icon-display="input" class="w-full" /></template>
      </FormField>
      <FormField id="rp-channel" label="Canal de recepción" required :error="errors.channel">
        <template #default="{ id, invalid }"><Select v-model="form.channel" :input-id="id" :options="CHANNEL_OPTIONS" option-label="label" option-value="value" :invalid="invalid" class="w-full" /></template>
      </FormField>
      <FormField id="rp-class" label="Clasificación" required :error="errors.classification">
        <template #default="{ id, invalid }"><Select v-model="form.classification" :input-id="id" :options="CLASSIFICATION_OPTIONS" option-label="label" option-value="value" :invalid="invalid" class="w-full" /></template>
      </FormField>
    </div>
    <FormField id="rp-factual" label="Relato de los hechos" required help="Transcriba lo informado sin interpretar ni incluir información innecesaria." :error="errors.factual">
      <template #default="{ id, invalid, describedby }"><Textarea :id="id" v-model="form.factual" rows="5" auto-resize maxlength="4000" :invalid="invalid" :aria-describedby="describedby" class="w-full" /></template>
    </FormField>
    <FormField id="rp-background" label="Antecedentes" :error="errors.background">
      <template #default="{ id, invalid }"><Textarea :id="id" v-model="form.background" rows="3" auto-resize maxlength="4000" :invalid="invalid" class="w-full" /></template>
    </FormField>
  </MutationDialog>

  <MutationDialog v-model:visible="voidOpen" header="Anular denuncia" submit-label="Anular registro" :pending="voidRecord.isPending.value" :error="voidRecord.error.value" @submit="submitVoid" @reload="query.refetch()">
    <p class="text-sm leading-relaxed text-slate-700">La denuncia dejará de mostrarse en la operación, pero conservará su trazabilidad y auditoría.</p>
    <FormField id="rp-void-reason" label="Motivo de la anulación" required :error="voidError">
      <template #default="{ id, invalid, describedby }"><Textarea :id="id" v-model="voidReason" rows="3" auto-resize maxlength="1000" :invalid="invalid" :aria-describedby="describedby" class="w-full" /></template>
    </FormField>
  </MutationDialog>

  <ConfirmActionDialog
    v-model:visible="deleteOpen" header="Eliminar denuncia" confirm-label="Eliminar definitivamente" danger
    :message="`Se eliminará definitivamente la denuncia recibida el ${deleteTarget ? formatDate(deleteTarget.receivedAt) : ''}. Dejará de aparecer en el expediente y en su línea de tiempo; solo quedará la auditoría de seguridad. Si necesita conservar el antecedente, use «Anular».`"
    :action="() => deleteRecord.mutateAsync({ id: deleteTarget!.id, expectedVersion: deleteTarget!.version })"
  />
</template>
