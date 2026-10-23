<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import Button from 'primevue/button';
import DatePicker from 'primevue/datepicker';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import AppIcon from '@/components/AppIcon.vue';
import ConfirmActionDialog from '@/components/ConfirmActionDialog.vue';
import FormField from '@/components/FormField.vue';
import MutationDialog from '@/components/MutationDialog.vue';
import QueryState from '@/components/QueryState.vue';
import SectionCard from '@/components/SectionCard.vue';
import { useCreateFollowUp, useDeleteFollowUp, useFollowUps, useVoidFollowUp } from '@/composables/useCaseContent';
import { useDirectory } from '@/composables/useDirectory';
import { useSession } from '@/composables/useSession';
import { dateToIso, formatDate, formatDateTime, isOverdue } from '@/lib/format';
import { maxLength, minLength, required, validateAll } from '@/lib/validation';

/** Seguimientos del expediente (`GET`/`POST /cases/:id/follow-ups`): registro de avances y de la próxima acción acordada. */
const props = defineProps<{ caseId: string }>();
const { can } = useSession();
const { nameOf } = useDirectory();
const query = useFollowUps(() => props.caseId);
const create = useCreateFollowUp(props.caseId);
const voidFollowUp = useVoidFollowUp(props.caseId);
const deleteFollowUp = useDeleteFollowUp(props.caseId);
const deleteTarget = ref<{ id: string; version: number } | null>(null);
const deleteOpen = computed({ get: () => Boolean(deleteTarget.value), set: (value: boolean) => { if (!value) deleteTarget.value = null; } });

const open = ref(false);
const now = new Date();
const form = reactive({ occurredAt: new Date() as Date | null, note: '', nextAction: '', nextActionDueAt: null as Date | null });
const errors = ref<Record<string, string>>({});
const voidOpen = ref(false);
const voidTarget = ref<{ id: string; version: number } | null>(null);
const voidReason = ref('');
const voidError = ref<string | null>(null);

function openForm() { Object.assign(form, { occurredAt: new Date(), note: '', nextAction: '', nextActionDueAt: null }); errors.value = {}; create.reset(); open.value = true; }
async function submit() {
  errors.value = validateAll(form, { occurredAt: [required('Indique la fecha y hora.')], note: [required('Describa el seguimiento.'), minLength(3), maxLength(4000)], nextAction: [maxLength(500)] }) as Record<string, string>;
  if (Object.keys(errors.value).length) return;
  try {
    await create.mutateAsync({ occurredAt: dateToIso(form.occurredAt!, true), note: form.note.trim(), ...(form.nextAction.trim() ? { nextAction: form.nextAction.trim() } : {}), ...(form.nextActionDueAt ? { nextActionDueAt: dateToIso(form.nextActionDueAt) } : {}) });
    open.value = false;
  } catch { /* el error se muestra en el diálogo */ }
}
function askVoid(item: { id: string; version: number }) { voidTarget.value = item; voidReason.value = ''; voidError.value = null; voidFollowUp.reset(); voidOpen.value = true; }
async function submitVoid() {
  voidError.value = voidReason.value.trim().length < 5 ? 'Indique el motivo de la anulación (al menos 5 caracteres).' : maxLength(1000)(voidReason.value);
  if (voidError.value || !voidTarget.value) return;
  try { await voidFollowUp.mutateAsync({ id: voidTarget.value.id, expectedVersion: voidTarget.value.version, reason: voidReason.value.trim() }); voidOpen.value = false; } catch { /* el error se muestra en el diálogo */ }
}
</script>

<template>
  <SectionCard dense title="Seguimientos" description="Avances registrados y próximas acciones acordadas.">
    <template v-if="can('follow-ups.create')" #actions>
      <Button label="Registrar seguimiento" size="small" @click="openForm"><template #icon><AppIcon name="plus" :size="15" /></template></Button>
    </template>
    <QueryState :data="query.data.value" :is-pending="query.isPending.value" :error="query.error.value" compact empty-title="Sin seguimientos" empty-description="Registre aquí cada revisión del caso y la próxima acción acordada." empty-icon="activity" subject="los seguimientos" @retry="query.refetch()">
      <template #default="{ data }">
        <ul class="space-y-3">
          <li v-for="item in [...data].reverse()" :key="item.id" class="rounded-lg border border-slate-200 p-4">
            <p class="text-sm font-semibold text-slate-900">{{ formatDateTime(item.occurredAt) }} <span class="font-normal text-slate-500">· {{ nameOf(item.createdByUserId, 'Persona no disponible') }}</span></p>
            <div class="flex items-start justify-between gap-3"><p class="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-800">{{ item.note }}</p><div v-if="can('follow-ups.create')" class="flex shrink-0 items-center gap-1"><Button size="small" severity="secondary" text :aria-label="'Anular seguimiento'" title="Anular seguimiento (se conserva en la trazabilidad)" @click="askVoid(item)"><template #icon><AppIcon name="ban" :size="16" /></template></Button><Button size="small" severity="danger" text :aria-label="'Eliminar seguimiento definitivamente'" title="Eliminar definitivamente" @click="deleteTarget = item"><template #icon><AppIcon name="trash" :size="16" /></template></Button></div></div>
            <p v-if="item.nextAction" class="mt-3 flex flex-wrap items-center gap-x-2 border-l-2 border-sky-200 pl-3 text-sm text-slate-700">
              <span class="text-xs font-medium text-slate-500">Próxima acción</span>{{ item.nextAction }}
              <span v-if="item.nextActionDueAt" :class="['text-xs tabular-nums', isOverdue(item.nextActionDueAt) ? 'font-semibold text-red-800' : 'text-slate-500']">· {{ isOverdue(item.nextActionDueAt) ? 'venció el' : 'plazo' }} {{ formatDate(item.nextActionDueAt) }}</span>
            </p>
          </li>
        </ul>
      </template>
    </QueryState>
  </SectionCard>

  <MutationDialog v-model:visible="open" header="Registrar seguimiento" submit-label="Registrar" :pending="create.isPending.value" :error="create.error.value" @submit="submit" @reload="query.refetch()">
    <FormField id="fu-when" label="Fecha y hora" required :error="errors.occurredAt">
      <template #default="{ id, invalid }"><DatePicker v-model="form.occurredAt" :input-id="id" show-time hour-format="24" date-format="dd-mm-yy" :max-date="now" :invalid="invalid" show-icon icon-display="input" class="w-full" /></template>
    </FormField>
    <FormField id="fu-note" label="Seguimiento" required :error="errors.note">
      <template #default="{ id, invalid, describedby }"><Textarea :id="id" v-model="form.note" rows="4" auto-resize maxlength="4000" :invalid="invalid" :aria-describedby="describedby" class="w-full" /></template>
    </FormField>
    <FormField id="fu-next" label="Próxima acción" :error="errors.nextAction">
      <template #default="{ id, invalid }"><InputText :id="id" v-model="form.nextAction" maxlength="500" :invalid="invalid" class="w-full" /></template>
    </FormField>
    <FormField id="fu-due" label="Plazo de la próxima acción">
      <template #default="{ id }"><DatePicker v-model="form.nextActionDueAt" :input-id="id" date-format="dd-mm-yy" :min-date="now" show-icon icon-display="input" show-button-bar class="w-full" /></template>
    </FormField>
  </MutationDialog>

  <MutationDialog v-model:visible="voidOpen" header="Anular seguimiento" submit-label="Anular registro" :pending="voidFollowUp.isPending.value" :error="voidFollowUp.error.value" @submit="submitVoid" @reload="query.refetch()">
    <p class="text-sm leading-relaxed text-slate-700">El seguimiento dejará de mostrarse en la operación, sin perder su registro de auditoría.</p>
    <FormField id="fu-void-reason" label="Motivo de la anulación" required :error="voidError">
      <template #default="{ id, invalid, describedby }"><Textarea :id="id" v-model="voidReason" rows="3" auto-resize maxlength="1000" :invalid="invalid" :aria-describedby="describedby" class="w-full" /></template>
    </FormField>
  </MutationDialog>

  <ConfirmActionDialog
    v-model:visible="deleteOpen" header="Eliminar seguimiento" confirm-label="Eliminar definitivamente" danger
    :message="`Se eliminará definitivamente este seguimiento. Dejará de aparecer en el expediente y en su línea de tiempo; solo quedará la auditoría de seguridad. Si necesita conservar el antecedente, use «Anular».`"
    :action="() => deleteFollowUp.mutateAsync({ id: deleteTarget!.id, expectedVersion: deleteTarget!.version })"
  />
</template>
