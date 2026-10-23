<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import Button from 'primevue/button';
import DatePicker from 'primevue/datepicker';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Textarea from 'primevue/textarea';
import AppIcon from '@/components/AppIcon.vue';
import FormField from '@/components/FormField.vue';
import MutationDialog from '@/components/MutationDialog.vue';
import QueryState from '@/components/QueryState.vue';
import SectionCard from '@/components/SectionCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { useCaseSummons, useCreateSummons, useUpdateSummons } from '@/composables/useCaseActions';
import { useCaseParticipants } from '@/composables/useCaseContent';
import { useSession } from '@/composables/useSession';
import { dateToIso, formatDateTime, isoToDate } from '@/lib/format';
import { maxLength, minLength, required, validateAll } from '@/lib/validation';
import type { CaseRecord, CaseSummons, SummonsStatus } from '@/types/api';

/**
 * Citaciones a reunión del expediente: se programan (con destinatario, lugar y motivo) y se cierran como realizadas, con
 * inasistencia o canceladas. Una citación programada puede reprogramarse; una cerrada ya no se modifica (regla del servidor).
 */
const props = defineProps<{ caseRecord: CaseRecord }>();
const { can } = useSession();
const query = useCaseSummons(() => props.caseRecord.id);
const participants = useCaseParticipants(() => props.caseRecord.id, () => can('participants.read'));
const create = useCreateSummons(props.caseRecord.id);
const update = useUpdateSummons(props.caseRecord.id);
const closed = computed(() => props.caseRecord.status === 'CERRADO');

const OTHER = '__otro__';
const recipientOptions = computed(() => [...(participants.data.value ?? []).map((link) => ({ value: link.participantId, label: link.participant.referenceLabel })), { value: OTHER, label: 'Otra persona (escribir)' }]);

const open = ref(false);
const form = reactive({ recipient: null as string | null, label: '', scheduledAt: null as Date | null, location: '', reason: '' });
const errors = ref<Record<string, string>>({});
const needsLabel = computed(() => form.recipient === OTHER || !(participants.data.value ?? []).length);
function openForm() { Object.assign(form, { recipient: null, label: '', scheduledAt: null, location: '', reason: '' }); errors.value = {}; create.reset(); open.value = true; }
async function submit() {
  errors.value = validateAll(form, {
    scheduledAt: [required('Indique la fecha y hora de la reunión.')], location: [required('Indique dónde será la reunión.'), minLength(2), maxLength(200)], reason: [required('Indique el motivo de la citación.'), minLength(3), maxLength(1000)],
    label: needsLabel.value ? [required('Indique a quién se cita.'), minLength(2), maxLength(160)] : [], recipient: needsLabel.value ? [] : [required('Elija a quién se cita.')]
  }) as Record<string, string>;
  if (Object.keys(errors.value).length) return;
  try {
    await create.mutateAsync({ ...(!needsLabel.value && form.recipient ? { participantId: form.recipient } : { recipientLabel: form.label.trim() }), scheduledAt: dateToIso(form.scheduledAt!, true), location: form.location.trim(), reason: form.reason.trim() });
    open.value = false;
  } catch { /* el error se muestra en el diálogo */ }
}

// Cierre o reprogramación de una citación programada
const acting = ref<{ summons: CaseSummons; mode: 'EDITAR' | SummonsStatus } | null>(null);
const actOpen = computed({ get: () => Boolean(acting.value), set: (v: boolean) => { if (!v) acting.value = null; } });
const act = reactive({ scheduledAt: null as Date | null, location: '', reason: '', note: '' });
const actErrors = ref<Record<string, string>>({});
const ACTION_TITLES: Record<string, string> = { EDITAR: 'Editar citación', REALIZADA: 'Registrar reunión realizada', NO_ASISTIO: 'Registrar inasistencia', CANCELADA: 'Cancelar citación' };
function openAct(summons: CaseSummons, mode: 'EDITAR' | SummonsStatus) { acting.value = { summons, mode }; Object.assign(act, { scheduledAt: isoToDate(summons.scheduledAt), location: summons.location, reason: summons.reason, note: '' }); actErrors.value = {}; update.reset(); }
async function submitAct() {
  const current = acting.value;
  if (!current) return;
  const editing = current.mode === 'EDITAR';
  actErrors.value = validateAll(act, { scheduledAt: editing ? [required('Indique la fecha y hora.')] : [], location: editing ? [required('Indique el lugar.'), minLength(2), maxLength(200)] : [], reason: editing ? [required('Indique el motivo de la citación.'), minLength(3), maxLength(1000)] : [], note: current.mode === 'CANCELADA' ? [required('Indique el motivo de la cancelación.'), maxLength(2000)] : [maxLength(2000)] }) as Record<string, string>;
  if (Object.keys(actErrors.value).length) return;
  try {
    await update.mutateAsync({ id: current.summons.id, expectedVersion: current.summons.version, ...(editing ? { scheduledAt: dateToIso(act.scheduledAt!, true), location: act.location.trim(), reason: act.reason.trim() } : { status: current.mode as SummonsStatus }), ...(act.note.trim() ? { outcomeNote: act.note.trim() } : {}) });
    actOpen.value = false;
  } catch { /* el error se muestra en el diálogo */ }
}
const isLate = (s: CaseSummons) => s.status === 'PROGRAMADA' && new Date(s.scheduledAt).getTime() < Date.now();
</script>

<template>
  <SectionCard dense title="Citaciones" description="Reuniones convocadas con las personas involucradas.">
    <template v-if="can('summons.manage')" #actions>
      <Button label="Nueva citación" size="small" :disabled="closed" :title="closed ? 'Reabra el expediente para registrar citaciones' : undefined" @click="openForm"><template #icon><AppIcon name="plus" :size="15" /></template></Button>
    </template>
    <p v-if="closed" class="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">El expediente está cerrado: reábralo para registrar citaciones nuevas.</p>
    <QueryState :data="query.data.value" :is-pending="query.isPending.value" :error="query.error.value" compact empty-title="Sin citaciones" empty-description="Programe una reunión con el apoderado, el estudiante u otra persona." empty-icon="mail" subject="las citaciones" @retry="query.refetch()">
      <template #default="{ data }">
        <ul class="space-y-3">
          <li v-for="s in data" :key="s.id" class="rounded-lg border border-slate-200 p-4">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <p class="min-w-0 flex-1 break-words text-sm font-semibold text-slate-900">{{ s.recipientLabel }}</p>
              <div class="flex items-center gap-2">
                <StatusBadge :status="s.status" />
                <div v-if="can('summons.manage') && s.status === 'PROGRAMADA' && !closed" class="flex items-center gap-1">
                  <Button size="small" severity="success" text aria-label="Registrar reunión realizada" title="Registrar reunión realizada" @click="openAct(s, 'REALIZADA')"><template #icon><AppIcon name="check-circle" :size="16" /></template></Button>
                  <Button size="small" severity="secondary" text aria-label="Registrar inasistencia" title="Registrar inasistencia" @click="openAct(s, 'NO_ASISTIO')"><template #icon><AppIcon name="ban" :size="16" /></template></Button>
                  <Button size="small" severity="secondary" text aria-label="Editar citación" title="Editar citación" @click="openAct(s, 'EDITAR')"><template #icon><AppIcon name="pencil" :size="16" /></template></Button>
                  <Button size="small" severity="danger" text aria-label="Cancelar citación" title="Cancelar citación" @click="openAct(s, 'CANCELADA')"><template #icon><AppIcon name="trash" :size="16" /></template></Button>
                </div>
              </div>
            </div>
            <p class="mt-1 whitespace-pre-line text-sm text-slate-700">{{ s.reason }}</p>
            <dl class="mt-3 grid gap-x-6 gap-y-1 text-xs text-slate-600 sm:grid-cols-2">
              <div class="flex gap-1"><dt class="text-slate-500">Fecha:</dt><dd :class="['tabular-nums', isLate(s) ? 'font-semibold text-red-800' : '']">{{ formatDateTime(s.scheduledAt) }}<span v-if="isLate(s)"> (sin cerrar)</span></dd></div>
              <div class="flex gap-1"><dt class="text-slate-500">Lugar:</dt><dd class="break-words">{{ s.location }}</dd></div>
              <div v-if="s.outcomeNote" class="flex gap-1 sm:col-span-2"><dt class="text-slate-500">Resultado:</dt><dd class="whitespace-pre-line break-words">{{ s.outcomeNote }}</dd></div>
            </dl>
          </li>
        </ul>
      </template>
    </QueryState>
  </SectionCard>

  <MutationDialog v-model:visible="open" header="Nueva citación" submit-label="Registrar citación" :pending="create.isPending.value" :error="create.error.value" @submit="submit" @reload="query.refetch()">
    <FormField v-if="(participants.data.value ?? []).length" id="sm-rec" label="A quién se cita" required :error="errors.recipient">
      <template #default="{ id, invalid }"><Select v-model="form.recipient" :input-id="id" :options="recipientOptions" option-label="label" option-value="value" :invalid="invalid" placeholder="Elija una persona del caso" class="w-full" /></template>
    </FormField>
    <FormField v-if="needsLabel" id="sm-label" label="Persona citada" required :help="(participants.data.value ?? []).length ? undefined : 'Escriba quién es citado, por ejemplo «Apoderado/a del estudiante A». Use la pestaña Involucrados para vincular personas al caso.'" :error="errors.label">
      <template #default="{ id, invalid, describedby }"><InputText :id="id" v-model="form.label" maxlength="160" :invalid="invalid" :aria-describedby="describedby" autocomplete="off" class="w-full" /></template>
    </FormField>
    <FormField id="sm-when" label="Fecha y hora" required :error="errors.scheduledAt">
      <template #default="{ id, invalid }"><DatePicker v-model="form.scheduledAt" :input-id="id" date-format="dd-mm-yy" show-time hour-format="24" :step-minute="5" :invalid="invalid" show-icon icon-display="input" class="w-full" /></template>
    </FormField>
    <FormField id="sm-where" label="Lugar" required :error="errors.location">
      <template #default="{ id, invalid, describedby }"><InputText :id="id" v-model="form.location" maxlength="200" :invalid="invalid" :aria-describedby="describedby" autocomplete="off" class="w-full" /></template>
    </FormField>
    <FormField id="sm-why" label="Motivo" required :error="errors.reason">
      <template #default="{ id, invalid, describedby }"><Textarea :id="id" v-model="form.reason" rows="3" auto-resize maxlength="1000" :invalid="invalid" :aria-describedby="describedby" class="w-full" /></template>
    </FormField>
  </MutationDialog>

  <MutationDialog v-model:visible="actOpen" :header="acting ? (ACTION_TITLES[acting.mode] ?? '') : ''" submit-label="Guardar" :danger="acting?.mode === 'CANCELADA'" :pending="update.isPending.value" :error="update.error.value" @submit="submitAct" @reload="query.refetch()">
    <template v-if="acting?.mode === 'EDITAR'">
      <FormField id="sa-when" label="Fecha y hora" required :error="actErrors.scheduledAt"><template #default="{ id, invalid }"><DatePicker v-model="act.scheduledAt" :input-id="id" date-format="dd-mm-yy" show-time hour-format="24" :step-minute="5" :invalid="invalid" show-icon icon-display="input" class="w-full" /></template></FormField>
      <FormField id="sa-where" label="Lugar" required :error="actErrors.location"><template #default="{ id, invalid }"><InputText :id="id" v-model="act.location" maxlength="200" :invalid="invalid" class="w-full" /></template></FormField>
      <FormField id="sa-reason" label="Motivo" required :error="actErrors.reason"><template #default="{ id, invalid }"><Textarea :id="id" v-model="act.reason" rows="3" auto-resize maxlength="1000" :invalid="invalid" class="w-full" /></template></FormField>
    </template>
    <FormField v-if="acting?.mode !== 'EDITAR'" id="sa-note" :label="acting?.mode === 'CANCELADA' ? 'Motivo de la cancelación' : 'Resultado o acuerdos (opcional)'" :required="acting?.mode === 'CANCELADA'" :error="actErrors.note">
      <template #default="{ id, invalid }"><Textarea :id="id" v-model="act.note" rows="3" auto-resize maxlength="2000" :invalid="invalid" class="w-full" /></template>
    </FormField>
    <p v-if="acting && acting.mode !== 'EDITAR'" class="text-xs text-slate-500">Al cerrar la citación ya no podrá modificarse.</p>
  </MutationDialog>
</template>
