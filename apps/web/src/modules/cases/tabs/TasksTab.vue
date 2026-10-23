<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import Button from 'primevue/button';
import DatePicker from 'primevue/datepicker';
import InputText from 'primevue/inputtext';
import AppIcon from '@/components/AppIcon.vue';
import ApiErrorMessage from '@/components/ApiErrorMessage.vue';
import FormField from '@/components/FormField.vue';
import MutationDialog from '@/components/MutationDialog.vue';
import QueryState from '@/components/QueryState.vue';
import SectionCard from '@/components/SectionCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import UserSelect from '@/components/UserSelect.vue';
import { useCompleteTask, useCreateTask, useTasks } from '@/composables/useCaseContent';
import { useDirectory } from '@/composables/useDirectory';
import { useSession } from '@/composables/useSession';
import { dateToIso, formatDate } from '@/lib/format';
import { isOverdueTask } from '@/lib/metrics';
import { maxLength, minLength, required, validateAll } from '@/lib/validation';

/** Tareas del expediente: crear (`POST`), asignar a una persona del establecimiento y completar (`POST …/complete`). */
const props = defineProps<{ caseId: string }>();
const { can } = useSession();
const { nameOf } = useDirectory();
const query = useTasks(() => props.caseId);
const create = useCreateTask(props.caseId);
const complete = useCompleteTask(props.caseId);

const open = ref(false);
const today = new Date();
const form = reactive({ title: '', dueAt: null as Date | null, assignee: null as string | null });
const errors = ref<Record<string, string>>({});
const completing = ref<string | null>(null);
const sorted = computed(() => [...(query.data.value ?? [])].sort((a, b) => Number(b.status === 'PENDIENTE') - Number(a.status === 'PENDIENTE') || (a.dueAt ?? '9999').localeCompare(b.dueAt ?? '9999')));

function openForm() { Object.assign(form, { title: '', dueAt: null, assignee: null }); errors.value = {}; create.reset(); open.value = true; }
async function submit() {
  errors.value = validateAll(form, { title: [required('Escriba la tarea.'), minLength(3), maxLength(300)] }) as Record<string, string>;
  if (Object.keys(errors.value).length) return;
  try {
    await create.mutateAsync({ title: form.title.trim(), ...(form.dueAt ? { dueAt: dateToIso(form.dueAt) } : {}), ...(form.assignee ? { assignedToUserId: form.assignee } : {}) });
    open.value = false;
  } catch { /* el error se muestra en el diálogo */ }
}
async function markDone(id: string) {
  completing.value = id; complete.reset();
  try { await complete.mutateAsync(id); } catch { /* se muestra arriba */ } finally { completing.value = null; }
}
</script>

<template>
  <SectionCard dense title="Tareas" description="Pendientes del equipo asociadas a este expediente.">
    <template v-if="can('tasks.manage')" #actions>
      <Button label="Nueva tarea" size="small" @click="openForm"><template #icon><AppIcon name="plus" :size="15" /></template></Button>
    </template>
    <ApiErrorMessage v-if="complete.error.value" class="mb-3" :error="complete.error.value" @reload="query.refetch()" />
    <QueryState :data="query.data.value ? sorted : undefined" :is-pending="query.isPending.value" :error="query.error.value" compact empty-title="Sin tareas" empty-description="Cree tareas para coordinar las próximas gestiones del caso." empty-icon="check-square" subject="las tareas" @retry="query.refetch()">
      <template #default="{ data }">
        <ul class="divide-y divide-slate-100">
          <li v-for="task in data" :key="task.id" class="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div class="min-w-0">
              <p :class="['break-words text-sm font-medium', task.status === 'PENDIENTE' ? 'text-slate-900' : 'text-slate-500 line-through']">{{ task.title }}</p>
              <p class="mt-0.5 text-xs text-slate-500">
                {{ task.assignedToUserId ? `Asignada a ${nameOf(task.assignedToUserId)}` : 'Sin asignar' }} ·
                <span :class="['tabular-nums', isOverdueTask(task) ? 'font-semibold text-red-800' : '']">{{ task.dueAt ? `${isOverdueTask(task) ? 'Venció el' : 'Plazo'} ${formatDate(task.dueAt)}` : 'Sin plazo' }}</span>
              </p>
            </div>
            <div class="flex items-center gap-2">
              <StatusBadge :status="task.status" />
              <Button v-if="task.status === 'PENDIENTE' && can('tasks.manage')" label="Completar" size="small" severity="secondary" outlined :loading="completing === task.id" @click="markDone(task.id)" />
            </div>
          </li>
        </ul>
      </template>
    </QueryState>
  </SectionCard>

  <MutationDialog v-model:visible="open" header="Nueva tarea" submit-label="Crear tarea" :pending="create.isPending.value" :error="create.error.value" @submit="submit" @reload="query.refetch()">
    <FormField id="tk-title" label="Tarea" required :error="errors.title">
      <template #default="{ id, invalid, describedby }"><InputText :id="id" v-model="form.title" maxlength="300" :invalid="invalid" :aria-describedby="describedby" class="w-full" /></template>
    </FormField>
    <FormField id="tk-due" label="Plazo">
      <template #default="{ id }"><DatePicker v-model="form.dueAt" :input-id="id" date-format="dd-mm-yy" :min-date="today" show-icon icon-display="input" show-button-bar class="w-full" /></template>
    </FormField>
    <FormField id="tk-user" label="Asignar a" help="Opcional. La persona recibirá una notificación.">
      <template #default="{ id }"><UserSelect :id="id" v-model="form.assignee" show-clear /></template>
    </FormField>
  </MutationDialog>
</template>
