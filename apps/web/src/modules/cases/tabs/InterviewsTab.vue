<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import Button from 'primevue/button';
import DatePicker from 'primevue/datepicker';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import AppIcon from '@/components/AppIcon.vue';
import FormField from '@/components/FormField.vue';
import MutationDialog from '@/components/MutationDialog.vue';
import QueryState from '@/components/QueryState.vue';
import SectionCard from '@/components/SectionCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { useCorrectInterview, useCreateInterview, useFinalizeInterview, useInterviews, useUpdateInterview, useVoidInterview } from '@/composables/useCaseContent';
import { useDirectory } from '@/composables/useDirectory';
import { useSession } from '@/composables/useSession';
import { MODALITY_OPTIONS, modalityLabel } from '@/lib/catalogs';
import { dateToIso, formatDateTime, isoToDate } from '@/lib/format';
import { maxLength, minLength, required, validateAll } from '@/lib/validation';
import type { Interview } from '@/types/api';

/**
 * Entrevistas del expediente. Una entrevista nace como borrador (editable), se finaliza y, si necesita cambios, se reabre con
 * una corrección que exige un motivo. Las notas restringidas se ocultan hasta que la persona decide mostrarlas.
 */
const props = defineProps<{ caseId: string }>();
const { can } = useSession();
const { nameOf } = useDirectory();
const query = useInterviews(() => props.caseId);
const create = useCreateInterview(props.caseId);
const update = useUpdateInterview(props.caseId);
const finalize = useFinalizeInterview(props.caseId);
const correct = useCorrectInterview(props.caseId);
const voidInterview = useVoidInterview(props.caseId);

const formOpen = ref(false);
const editing = ref<Interview | null>(null);
const form = reactive({ occurredAt: new Date() as Date | null, modality: 'PRESENCIAL' as string | null, summary: '', restricted: '', agreements: '' });
const errors = ref<Record<string, string>>({});
const revealed = reactive<Record<string, boolean>>({});
const target = ref<Interview | null>(null);
const mode = ref<'finalize' | 'correct' | null>(null);
const reason = ref('');
const reasonError = ref<string | null>(null);
const voidOpen = ref(false);
const voidTarget = ref<Interview | null>(null);
const voidReason = ref('');
const voidError = ref<string | null>(null);
const actionOpen = computed({ get: () => Boolean(target.value && mode.value), set: (v: boolean) => { if (!v) { target.value = null; mode.value = null; } } });
const formMutation = computed(() => (editing.value ? update : create));

function openForm(interview: Interview | null) {
  editing.value = interview;
  Object.assign(form, interview
    ? { occurredAt: isoToDate(interview.occurredAt), modality: interview.modalityCode, summary: interview.summary, restricted: interview.restrictedNotes ?? '', agreements: interview.agreements ?? '' }
    : { occurredAt: new Date(), modality: 'PRESENCIAL', summary: '', restricted: '', agreements: '' });
  errors.value = {}; create.reset(); update.reset(); formOpen.value = true;
}
async function submit() {
  errors.value = validateAll(form, { occurredAt: [required('Indique la fecha y hora.')], modality: [required('Seleccione la modalidad.')], summary: [required('Escriba la síntesis de la entrevista.'), minLength(3), maxLength(4000)], restricted: [maxLength(4000)], agreements: [maxLength(4000)] }) as Record<string, string>;
  if (Object.keys(errors.value).length) return;
  const body = { occurredAt: dateToIso(form.occurredAt!, true), modalityCode: form.modality!, summary: form.summary.trim(), ...(form.restricted.trim() ? { restrictedNotes: form.restricted.trim() } : {}), ...(form.agreements.trim() ? { agreements: form.agreements.trim() } : {}) };
  try {
    if (editing.value) await update.mutateAsync({ ...body, id: editing.value.id, expectedVersion: editing.value.version });
    else await create.mutateAsync(body);
    formOpen.value = false;
  } catch { /* el error se muestra en el diálogo */ }
}

function ask(interview: Interview, action: 'finalize' | 'correct') { target.value = interview; mode.value = action; reason.value = ''; reasonError.value = null; finalize.reset(); correct.reset(); }
async function confirm() {
  if (!target.value || !mode.value) return;
  try {
    if (mode.value === 'finalize') await finalize.mutateAsync({ id: target.value.id, expectedVersion: target.value.version });
    else {
      reasonError.value = reason.value.trim().length < 5 ? 'Escriba el motivo de la corrección (al menos 5 caracteres).' : maxLength(1000)(reason.value);
      if (reasonError.value) return;
      await correct.mutateAsync({ id: target.value.id, reason: reason.value.trim() });
    }
    actionOpen.value = false;
  } catch { /* el error se muestra en el diálogo */ }
}
const actionMutation = computed(() => (mode.value === 'finalize' ? finalize : correct));
function askVoid(interview: Interview) { voidTarget.value = interview; voidReason.value = ''; voidError.value = null; voidInterview.reset(); voidOpen.value = true; }
async function submitVoid() {
  voidError.value = voidReason.value.trim().length < 5 ? 'Indique el motivo de la anulación (al menos 5 caracteres).' : maxLength(1000)(voidReason.value);
  if (voidError.value || !voidTarget.value) return;
  try { await voidInterview.mutateAsync({ id: voidTarget.value.id, expectedVersion: voidTarget.value.version, reason: voidReason.value.trim() }); voidOpen.value = false; } catch { /* el error se muestra en el diálogo */ }
}
</script>

<template>
  <SectionCard dense title="Entrevistas" description="Registro de las entrevistas realizadas en el marco del caso.">
    <template v-if="can('interviews.create')" #actions>
      <Button label="Registrar entrevista" size="small" @click="openForm(null)"><template #icon><AppIcon name="plus" :size="15" /></template></Button>
    </template>
    <QueryState :data="query.data.value" :is-pending="query.isPending.value" :error="query.error.value" compact empty-title="Sin entrevistas" empty-description="Registre aquí las entrevistas realizadas. Quedarán como borrador hasta que las finalice." empty-icon="message" subject="las entrevistas" @retry="query.refetch()">
      <template #default="{ data }">
        <ul class="space-y-4">
          <li v-for="item in [...data].reverse()" :key="item.id" class="rounded-lg border border-slate-200 p-4">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-slate-900">{{ formatDateTime(item.occurredAt) }} <span class="font-normal text-slate-500">· {{ modalityLabel(item.modalityCode) }}</span></p>
                <p class="mt-0.5 text-xs text-slate-500">Entrevistó: {{ nameOf(item.interviewerUserId, 'Persona no disponible') }}</p>
              </div>
              <div class="flex items-center gap-2">
                <StatusBadge :status="item.status" />
                <div class="flex items-center gap-1">
                  <template v-if="item.status === 'BORRADOR'">
                    <Button v-if="can('interviews.update')" size="small" severity="secondary" text aria-label="Editar borrador" title="Editar borrador" @click="openForm(item)"><template #icon><AppIcon name="pencil" :size="16" /></template></Button>
                    <Button v-if="can('interviews.finalize')" size="small" severity="success" text aria-label="Finalizar entrevista" title="Finalizar entrevista" @click="ask(item, 'finalize')"><template #icon><AppIcon name="check-circle" :size="16" /></template></Button>
                  </template>
                  <Button v-else-if="can('interviews.correct')" size="small" severity="secondary" text aria-label="Corregir entrevista (reabrir como borrador)" title="Corregir entrevista (reabrir como borrador)" @click="ask(item, 'correct')"><template #icon><AppIcon name="refresh" :size="16" /></template></Button>
                  <Button v-if="can('interviews.correct')" size="small" severity="danger" text aria-label="Anular entrevista" title="Anular entrevista" @click="askVoid(item)"><template #icon><AppIcon name="trash" :size="16" /></template></Button>
                </div>
              </div>
            </div>
            <p class="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-800">{{ item.summary }}</p>
            <p v-if="item.agreements" class="mt-3 whitespace-pre-line border-l-2 border-slate-200 pl-3 text-sm leading-relaxed text-slate-700"><span class="block text-xs font-medium text-slate-500">Acuerdos</span>{{ item.agreements }}</p>
            <div v-if="item.restrictedNotes" class="mt-3">
              <Button v-if="!revealed[item.id]" label="Mostrar notas restringidas" size="small" severity="secondary" text @click="revealed[item.id] = true"><template #icon><AppIcon name="eye" :size="15" /></template></Button>
              <div v-else class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                <p class="flex items-center justify-between text-xs font-medium text-amber-900">Notas restringidas <button type="button" class="rounded underline" @click="revealed[item.id] = false">Ocultar</button></p>
                <p class="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-800">{{ item.restrictedNotes }}</p>
              </div>
            </div>
          </li>
        </ul>
      </template>
    </QueryState>
  </SectionCard>

  <MutationDialog v-model:visible="formOpen" :header="editing ? 'Editar borrador de entrevista' : 'Registrar entrevista'" :submit-label="editing ? 'Guardar borrador' : 'Guardar como borrador'" width="38rem" :pending="formMutation.isPending.value" :error="formMutation.error.value" @submit="submit" @reload="query.refetch()">
    <div class="grid gap-4 sm:grid-cols-2">
      <FormField id="iv-when" label="Fecha y hora" required :error="errors.occurredAt">
        <template #default="{ id, invalid }"><DatePicker v-model="form.occurredAt" :input-id="id" show-time hour-format="24" date-format="dd-mm-yy" :max-date="new Date()" :invalid="invalid" show-icon icon-display="input" class="w-full" /></template>
      </FormField>
      <FormField id="iv-modality" label="Modalidad" required :error="errors.modality">
        <template #default="{ id, invalid }"><Select v-model="form.modality" :input-id="id" :options="MODALITY_OPTIONS" option-label="label" option-value="value" :invalid="invalid" class="w-full" /></template>
      </FormField>
    </div>
    <FormField id="iv-summary" label="Síntesis" required :error="errors.summary">
      <template #default="{ id, invalid, describedby }"><Textarea :id="id" v-model="form.summary" rows="4" auto-resize maxlength="4000" :invalid="invalid" :aria-describedby="describedby" class="w-full" /></template>
    </FormField>
    <FormField id="iv-agreements" label="Acuerdos" :error="errors.agreements">
      <template #default="{ id, invalid }"><Textarea :id="id" v-model="form.agreements" rows="3" auto-resize maxlength="4000" :invalid="invalid" class="w-full" /></template>
    </FormField>
    <FormField id="iv-restricted" label="Notas restringidas" help="Información sensible: se oculta por defecto al consultar la entrevista." :error="errors.restricted">
      <template #default="{ id, invalid, describedby }"><Textarea :id="id" v-model="form.restricted" rows="3" auto-resize maxlength="4000" :invalid="invalid" :aria-describedby="describedby" class="w-full" /></template>
    </FormField>
  </MutationDialog>

  <MutationDialog
    v-model:visible="actionOpen" :header="mode === 'finalize' ? 'Finalizar entrevista' : 'Corregir entrevista'" :submit-label="mode === 'finalize' ? 'Finalizar' : 'Reabrir para corregir'"
    :pending="actionMutation.isPending.value" :error="actionMutation.error.value" @submit="confirm" @reload="query.refetch()"
  >
    <p v-if="mode === 'finalize'" class="text-sm leading-relaxed text-slate-700">Al finalizar, la entrevista deja de ser editable. Si después detecta un error, podrá reabrirla indicando el motivo de la corrección.</p>
    <template v-else>
      <p class="text-sm leading-relaxed text-slate-700">La entrevista volverá a borrador para poder editarla. La corrección y su motivo quedan registrados.</p>
      <FormField id="iv-reason" label="Motivo de la corrección" required :error="reasonError">
        <template #default="{ id, invalid, describedby }"><Textarea :id="id" v-model="reason" rows="3" auto-resize maxlength="1000" :invalid="invalid" :aria-describedby="describedby" class="w-full" /></template>
      </FormField>
    </template>
  </MutationDialog>

  <MutationDialog v-model:visible="voidOpen" header="Anular entrevista" submit-label="Anular registro" :pending="voidInterview.isPending.value" :error="voidInterview.error.value" @submit="submitVoid" @reload="query.refetch()">
    <p class="text-sm leading-relaxed text-slate-700">La entrevista dejará de aparecer en el expediente. La anulación y su motivo se conservarán en la trazabilidad.</p>
    <FormField id="iv-void-reason" label="Motivo de la anulación" required :error="voidError">
      <template #default="{ id, invalid, describedby }"><Textarea :id="id" v-model="voidReason" rows="3" auto-resize maxlength="1000" :invalid="invalid" :aria-describedby="describedby" class="w-full" /></template>
    </FormField>
  </MutationDialog>
</template>
