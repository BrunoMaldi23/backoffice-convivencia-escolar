<script setup lang="ts">
import { reactive, ref } from 'vue';
import Button from 'primevue/button';
import DatePicker from 'primevue/datepicker';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import AppIcon from '@/components/AppIcon.vue';
import FormField from '@/components/FormField.vue';
import MutationDialog from '@/components/MutationDialog.vue';
import QueryState from '@/components/QueryState.vue';
import SectionCard from '@/components/SectionCard.vue';
import { useCreateFollowUp, useFollowUps } from '@/composables/useCaseContent';
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

const open = ref(false);
const now = new Date();
const form = reactive({ occurredAt: new Date() as Date | null, note: '', nextAction: '', nextActionDueAt: null as Date | null });
const errors = ref<Record<string, string>>({});

function openForm() { Object.assign(form, { occurredAt: new Date(), note: '', nextAction: '', nextActionDueAt: null }); errors.value = {}; create.reset(); open.value = true; }
async function submit() {
  errors.value = validateAll(form, { occurredAt: [required('Indique la fecha y hora.')], note: [required('Describa el seguimiento.'), minLength(3), maxLength(4000)], nextAction: [maxLength(500)] }) as Record<string, string>;
  if (Object.keys(errors.value).length) return;
  try {
    await create.mutateAsync({ occurredAt: dateToIso(form.occurredAt!, true), note: form.note.trim(), ...(form.nextAction.trim() ? { nextAction: form.nextAction.trim() } : {}), ...(form.nextActionDueAt ? { nextActionDueAt: dateToIso(form.nextActionDueAt) } : {}) });
    open.value = false;
  } catch { /* el error se muestra en el diálogo */ }
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
            <p class="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-800">{{ item.note }}</p>
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
</template>
