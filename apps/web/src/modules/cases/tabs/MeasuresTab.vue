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
import StatusBadge from '@/components/StatusBadge.vue';
import UserSelect from '@/components/UserSelect.vue';
import { useCreateMeasure, useMeasures, useUpdateMeasure } from '@/composables/useCaseContent';
import { useDirectory } from '@/composables/useDirectory';
import { useSession } from '@/composables/useSession';
import { dateToIso, formatDate, isOverdue, isoToDate } from '@/lib/format';
import { isOverdueMeasure } from '@/lib/metrics';
import { maxLength, minLength, required, validateAll } from '@/lib/validation';
import type { CaseMeasure, CaseRecord, MeasureStatus } from '@/types/api';

/**
 * Medidas de resguardo: registro con responsables y plazo, y cambio de estado (pendiente, completada o cancelada) o de plazo, con
 * control de versión. Crear una medida exige un expediente abierto (regla del servidor). El cumplimiento se registra al completarla.
 */
const props = defineProps<{ caseRecord: CaseRecord }>();
const { can } = useSession();
const { nameOf } = useDirectory();
const query = useMeasures(() => props.caseRecord.id);
const create = useCreateMeasure(props.caseRecord.id);
const update = useUpdateMeasure(props.caseRecord.id);

const open = ref(false);
const form = reactive({ title: '', description: '', dueAt: null as Date | null, responsibles: [] as string[], pick: null as string | null });
const errors = ref<Record<string, string>>({});
const today = new Date();
const closed = computed(() => props.caseRecord.status === 'CERRADO');

const changing = ref<{ measure: CaseMeasure; status: MeasureStatus } | null>(null);
const changeOpen = computed({ get: () => Boolean(changing.value), set: (v: boolean) => { if (!v) changing.value = null; } });
const dueTarget = ref<CaseMeasure | null>(null);
const dueValue = ref<Date | null>(null);
const dueOpen = computed({ get: () => Boolean(dueTarget.value), set: (v: boolean) => { if (!v) dueTarget.value = null; } });

function openForm() { Object.assign(form, { title: '', description: '', dueAt: null, responsibles: [], pick: null }); errors.value = {}; create.reset(); open.value = true; }
function addResponsible() { if (form.pick && !form.responsibles.includes(form.pick)) form.responsibles.push(form.pick); form.pick = null; }
async function submit() {
  errors.value = validateAll(form, { title: [required('Escriba el nombre de la medida.'), minLength(3), maxLength(300)], description: [maxLength(4000)] }) as Record<string, string>;
  if (Object.keys(errors.value).length) return;
  try {
    await create.mutateAsync({ title: form.title.trim(), ...(form.description.trim() ? { description: form.description.trim() } : {}), ...(form.dueAt ? { dueAt: dateToIso(form.dueAt) } : {}), responsibleUserIds: form.responsibles });
    open.value = false;
  } catch { /* el error se muestra en el diálogo */ }
}
const labels: Record<MeasureStatus, string> = { PENDIENTE: 'Reabrir como pendiente', COMPLETADA: 'Marcar como cumplida', CANCELADA: 'Cancelar medida' };
function editDue(measure: CaseMeasure) { dueTarget.value = measure; dueValue.value = isoToDate(measure.dueAt); update.reset(); }
</script>

<template>
  <SectionCard dense title="Medidas de resguardo" description="Medidas adoptadas, sus responsables y plazos.">
    <template v-if="can('measures.manage')" #actions>
      <Button label="Registrar medida" size="small" :disabled="closed" :title="closed ? 'Reabra el expediente para registrar medidas' : undefined" @click="openForm"><template #icon><AppIcon name="plus" :size="15" /></template></Button>
    </template>
    <p v-if="closed" class="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">El expediente está cerrado: reábralo para registrar medidas nuevas.</p>
    <QueryState :data="query.data.value" :is-pending="query.isPending.value" :error="query.error.value" compact empty-title="Sin medidas registradas" empty-description="Registre las medidas de resguardo acordadas para este caso." empty-icon="shield" subject="las medidas" @retry="query.refetch()">
      <template #default="{ data }">
        <ul class="space-y-3">
          <li v-for="m in data" :key="m.id" class="rounded-lg border border-slate-200 p-4">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <p class="min-w-0 break-words text-sm font-semibold text-slate-900">{{ m.title }}</p>
              <StatusBadge :status="m.status" />
            </div>
            <p v-if="m.description" class="mt-1 whitespace-pre-line text-sm text-slate-700">{{ m.description }}</p>
            <dl class="mt-3 grid gap-x-6 gap-y-1 text-xs text-slate-600 sm:grid-cols-2">
              <div class="flex gap-1"><dt class="text-slate-500">Plazo:</dt><dd :class="['tabular-nums', isOverdueMeasure(m) ? 'font-semibold text-red-800' : '']">{{ m.dueAt ? formatDate(m.dueAt) : 'Sin plazo' }}<span v-if="isOverdueMeasure(m)"> (vencido)</span></dd></div>
              <div v-if="m.completedAt" class="flex gap-1"><dt class="text-slate-500">Cumplida el:</dt><dd class="tabular-nums">{{ formatDate(m.completedAt) }}</dd></div>
              <div class="flex gap-1 sm:col-span-2"><dt class="text-slate-500">Responsables:</dt><dd>{{ m.responsibles.length ? m.responsibles.map((r) => nameOf(r.userId)).join(', ') : 'Sin responsables asignados' }}</dd></div>
            </dl>
            <div v-if="can('measures.manage')" class="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              <template v-if="m.status === 'PENDIENTE'">
                <Button label="Marcar como cumplida" size="small" @click="changing = { measure: m, status: 'COMPLETADA' }" />
                <Button label="Cambiar plazo" size="small" severity="secondary" outlined @click="editDue(m)" />
                <Button label="Cancelar medida" size="small" severity="danger" text @click="changing = { measure: m, status: 'CANCELADA' }" />
              </template>
              <Button v-else label="Reabrir como pendiente" size="small" severity="secondary" outlined @click="changing = { measure: m, status: 'PENDIENTE' }" />
            </div>
          </li>
        </ul>
      </template>
    </QueryState>
  </SectionCard>

  <MutationDialog v-model:visible="open" header="Registrar medida de resguardo" submit-label="Registrar" :pending="create.isPending.value" :error="create.error.value" @submit="submit" @reload="query.refetch()">
    <FormField id="ms-title" label="Medida" required :error="errors.title">
      <template #default="{ id, invalid, describedby }"><InputText :id="id" v-model="form.title" maxlength="300" :invalid="invalid" :aria-describedby="describedby" class="w-full" /></template>
    </FormField>
    <FormField id="ms-desc" label="Descripción" :error="errors.description">
      <template #default="{ id, invalid }"><Textarea :id="id" v-model="form.description" rows="3" auto-resize maxlength="4000" :invalid="invalid" class="w-full" /></template>
    </FormField>
    <FormField id="ms-due" label="Plazo">
      <template #default="{ id }"><DatePicker v-model="form.dueAt" :input-id="id" date-format="dd-mm-yy" :min-date="today" show-icon icon-display="input" show-button-bar class="w-full" /></template>
    </FormField>
    <FormField id="ms-pick" label="Responsables" help="Personas con acceso al establecimiento. Puede agregar más de una.">
      <template #default="{ id }">
        <div class="flex gap-2"><div class="min-w-0 flex-1"><UserSelect :id="id" v-model="form.pick" /></div><Button type="button" label="Agregar" severity="secondary" outlined :disabled="!form.pick" @click="addResponsible" /></div>
        <ul v-if="form.responsibles.length" class="mt-2 flex flex-wrap gap-2">
          <li v-for="userId in form.responsibles" :key="userId" class="inline-flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-3 pr-1.5 text-sm text-slate-800">
            {{ nameOf(userId) }}<button type="button" class="flex h-5 w-5 items-center justify-center rounded-full hover:bg-slate-200" :aria-label="`Quitar a ${nameOf(userId)}`" @click="form.responsibles = form.responsibles.filter((u) => u !== userId)"><AppIcon name="x" :size="12" /></button>
          </li>
        </ul>
      </template>
    </FormField>
  </MutationDialog>

  <ConfirmActionDialog
    v-model:visible="changeOpen" :header="changing ? labels[changing.status] : ''" :confirm-label="changing ? labels[changing.status] : ''" :danger="changing?.status === 'CANCELADA'"
    :message="`Medida: «${changing?.measure.title ?? ''}».`" :action="() => update.mutateAsync({ id: changing!.measure.id, expectedVersion: changing!.measure.version, status: changing!.status })"
  />

  <MutationDialog v-model:visible="dueOpen" header="Cambiar plazo" submit-label="Guardar plazo" :pending="update.isPending.value" :error="update.error.value" @submit="update.mutateAsync({ id: dueTarget!.id, expectedVersion: dueTarget!.version, dueAt: dueValue ? dateToIso(dueValue) : null }).then(() => (dueOpen = false)).catch(() => undefined)" @reload="query.refetch()">
    <FormField id="ms-newdue" label="Nuevo plazo" help="Déjelo vacío para quitar el plazo.">
      <template #default="{ id }"><DatePicker v-model="dueValue" :input-id="id" date-format="dd-mm-yy" show-icon icon-display="input" show-button-bar class="w-full" /></template>
    </FormField>
    <p v-if="dueTarget && isOverdue(dueTarget.dueAt)" class="text-xs text-red-800">El plazo actual está vencido.</p>
  </MutationDialog>
</template>
