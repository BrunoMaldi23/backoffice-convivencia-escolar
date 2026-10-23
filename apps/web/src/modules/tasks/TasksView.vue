<script setup lang="ts">
import { computed, ref } from 'vue';
import Button from 'primevue/button';
import ApiErrorMessage from '@/components/ApiErrorMessage.vue';
import AppIcon from '@/components/AppIcon.vue';
import ConfirmActionDialog from '@/components/ConfirmActionDialog.vue';
import AppTable from '@/components/AppTable.vue';
import PageHeader from '@/components/PageHeader.vue';
import QueryState from '@/components/QueryState.vue';
import ScopeNotice from '@/components/ScopeNotice.vue';
import SearchToolbar from '@/components/SearchToolbar.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import type { ColumnDef, FilterDef } from '@/components/types';
import { useApiMutation, caseScope } from '@/composables/useApiMutation';
import { useDirectory } from '@/composables/useDirectory';
import { useScopedTasks, type ScopedRow } from '@/composables/useScoped';
import { useSession } from '@/composables/useSession';
import { formatFolio } from '@/lib/catalogs';
import { formatDate } from '@/lib/format';
import { isOverdueTask } from '@/lib/metrics';
import { optionsFrom } from '@/lib/status';
import { completeTask, deleteTask, updateTask } from '@/services/caseOperations';
import type { CaseTask } from '@/types/api';

/**
 * Tareas de todos los expedientes revisados. Desde aquí se pueden completar, cancelar (se conserva el antecedente) o eliminar definitivamente
 * si siguen pendientes; las nuevas se crean dentro del expediente, que debe estar abierto.
 */
const { can, user } = useSession();
const { nameOf } = useDirectory();
const query = useScopedTasks({ includeClosed: true });
const complete = useApiMutation((v: { caseId: string; id: string }) => completeTask(v.caseId, v.id), (_d, v) => caseScope(v.caseId));
const completing = ref<string | null>(null);
type TaskAction = { caseId: string; id: string; expectedVersion: number };
const cancel = useApiMutation((v: TaskAction) => updateTask(v.caseId, v.id, { expectedVersion: v.expectedVersion, status: 'CANCELADA' }), (_d, v) => caseScope(v.caseId));
const remove = useApiMutation((v: TaskAction) => deleteTask(v.caseId, v.id, v.expectedVersion), (_d, v) => caseScope(v.caseId));
const cancelTarget = ref<ScopedRow<CaseTask> | null>(null);
const deleteTarget = ref<ScopedRow<CaseTask> | null>(null);
const cancelOpen = computed({ get: () => Boolean(cancelTarget.value), set: (value: boolean) => { if (!value) cancelTarget.value = null; } });
const deleteOpen = computed({ get: () => Boolean(deleteTarget.value), set: (value: boolean) => { if (!value) deleteTarget.value = null; } });
const actionOf = (target: ScopedRow<CaseTask> | null): TaskAction => ({ caseId: target!.case.id, id: target!.item.id, expectedVersion: target!.item.version });
const canAct = (row: { status: string; case: { status: string } }) => row.status === 'PENDIENTE' && row.case.status !== 'CERRADO' && can('tasks.manage');
const now = new Date();
const search = ref('');
const values = ref<Record<string, string | null>>({ status: 'PENDIENTE', owner: null, due: null });
const filters: FilterDef[] = [
  { field: 'status', label: 'Estado', options: optionsFrom(['PENDIENTE', 'COMPLETADA', 'CANCELADA']) },
  { field: 'owner', label: 'Asignación', options: [{ value: 'me', label: 'Asignadas a mí' }, { value: 'none', label: 'Sin asignar' }] },
  { field: 'due', label: 'Plazo', options: [{ value: 'overdue', label: 'Vencidas' }, { value: 'dated', label: 'Con plazo' }, { value: 'none', label: 'Sin plazo' }] }
];
const columns: ColumnDef[] = [
  { field: 'title', header: 'Tarea', sortable: true }, { field: 'case', header: 'Expediente', minScreen: 'sm' }, { field: 'assignedToUserId', header: 'Asignada a', minScreen: 'lg' },
  { field: 'dueAt', header: 'Plazo', sortable: true }, { field: 'status', header: 'Estado' }
];
type Row = ScopedRow<CaseTask> & { id: string; title: string; dueAt: string | null; status: string; assignedToUserId: string | null };
const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const rows = computed<Row[]>(() => (query.data.value?.rows ?? []).map((row) => ({ ...row, id: row.item.id, title: row.item.title, dueAt: row.item.dueAt, status: row.item.status, assignedToUserId: row.item.assignedToUserId }))
  .filter((row) => {
    const { status, owner, due } = values.value;
    return (!status || row.status === status) && (!owner || (owner === 'me' ? row.assignedToUserId === user.value?.id : !row.assignedToUserId)) &&
      (!due || (due === 'overdue' ? isOverdueTask(row.item, now) : due === 'dated' ? Boolean(row.dueAt) : !row.dueAt)) &&
      (!search.value.trim() || normalize(`${row.title} ${formatFolio(row.case.folio)} ${row.case.title}`).includes(normalize(search.value.trim())));
  }).sort((a, b) => (a.dueAt ?? '9999').localeCompare(b.dueAt ?? '9999')));
const rowTo = (row: Row) => ({ name: 'cases-detail', params: { id: row.case.id }, query: { tab: 'tareas' } });
async function markDone(row: Row) { completing.value = row.id; complete.reset(); try { await complete.mutateAsync({ caseId: row.case.id, id: row.id }); } catch { /* se muestra arriba */ } finally { completing.value = null; } }
</script>

<template>
  <div>
    <PageHeader title="Tareas" description="Tareas de los expedientes a los que usted tiene acceso." />
    <ScopeNotice v-if="query.data.value" :result="query.data.value" noun="Tareas" />
    <ApiErrorMessage v-if="complete.error.value" class="mb-4" :error="complete.error.value" @reload="query.refetch()" />
    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Tareas">
      <SearchToolbar v-model:search="search" v-model:values="values" :filters="filters" placeholder="Buscar por tarea o expediente" :total="query.data.value ? rows.length : null" />
      <QueryState :data="query.data.value?.rows" :is-pending="query.isPending.value" :error="query.error.value" subject="las tareas" empty-icon="check-square" empty-title="No hay tareas registradas" empty-description="Las tareas se crean dentro de cada expediente." @retry="query.refetch()">
        <template #default>
          <AppTable :rows="rows" :columns="columns" label="Tareas" :row-to="rowTo" :detail-label="(row) => `Abrir tareas de ${formatFolio(row.case.folio)}`" :page-size="12">
            <template #cell-title="{ row }"><span :class="['block max-w-[14rem] truncate font-medium sm:max-w-xs', row.status === 'PENDIENTE' ? '' : 'text-slate-500 line-through']" :title="row.title">{{ row.title }}</span></template>
            <template #cell-case="{ row }"><span class="tabular-nums">{{ formatFolio(row.case.folio) }}</span></template>
            <template #cell-assignedToUserId="{ row }">{{ row.assignedToUserId ? nameOf(row.assignedToUserId) : 'Sin asignar' }}</template>
            <template #cell-dueAt="{ row }"><span :class="['whitespace-nowrap tabular-nums', isOverdueTask(row.item, now) ? 'font-semibold text-red-800' : '']">{{ row.dueAt ? formatDate(row.dueAt) : '—' }}<span v-if="isOverdueTask(row.item, now)" class="sr-only"> (vencida)</span></span></template>
            <template #cell-status="{ row }"><StatusBadge :status="row.status" /></template>
            <template #actions="{ row }">
              <div v-if="canAct(row)" class="flex items-center gap-1">
                <Button :loading="completing === row.id" size="small" severity="success" text aria-label="Completar tarea" title="Completar tarea" @click="markDone(row)"><template #icon><AppIcon name="check-circle" :size="16" /></template></Button>
                <Button size="small" severity="secondary" text aria-label="Cancelar tarea (se conserva en la trazabilidad)" title="Cancelar tarea (se conserva en la trazabilidad)" @click="cancelTarget = row"><template #icon><AppIcon name="ban" :size="16" /></template></Button>
                <Button size="small" severity="danger" text aria-label="Eliminar tarea definitivamente" title="Eliminar tarea definitivamente" @click="deleteTarget = row"><template #icon><AppIcon name="trash" :size="16" /></template></Button>
              </div>
            </template>
            <template #empty><div class="px-6 py-10 text-center text-sm text-slate-600">Sin coincidencias. Ajuste la búsqueda o los filtros.</div></template>
          </AppTable>
        </template>
      </QueryState>
    </section>
    <ConfirmActionDialog
      v-model:visible="cancelOpen" header="Cancelar tarea" confirm-label="Cancelar tarea" danger
      :message="`La tarea «${cancelTarget?.item.title ?? ''}» quedará cancelada y conservará su trazabilidad.`"
      :action="() => cancel.mutateAsync(actionOf(cancelTarget))"
    />
    <ConfirmActionDialog
      v-model:visible="deleteOpen" header="Eliminar tarea" confirm-label="Eliminar definitivamente" danger
      :message="`Se eliminará definitivamente la tarea «${deleteTarget?.item.title ?? ''}». Dejará de aparecer en el expediente y en su línea de tiempo; solo quedará la auditoría de seguridad. Si necesita conservar el antecedente, use «Cancelar tarea».`"
      :action="() => remove.mutateAsync(actionOf(deleteTarget))"
    />
  </div>
</template>
