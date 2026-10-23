<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Drawer from 'primevue/drawer';
import Select from 'primevue/select';
import AppIcon from '@/components/AppIcon.vue';
import AppTable from '@/components/AppTable.vue';
import DetailPanel from '@/components/DetailPanel.vue';
import FormField from '@/components/FormField.vue';
import PageHeader from '@/components/PageHeader.vue';
import QueryState from '@/components/QueryState.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import type { ColumnDef } from '@/components/types';
import { useAudit } from '@/composables/useAdmin';
import { useDirectory } from '@/composables/useDirectory';
import { AUDIT_ACTIONS, auditActionLabel, auditResult, TARGET_TYPES, targetTypeLabel } from '@/lib/audit';
import { formatDateTime } from '@/lib/format';
import type { AuditEntry } from '@/types/api';

/**
 * Auditoría de seguridad en solo lectura (`GET /audit`, filtros por evento y recurso, paginación del servidor). Los metadatos que
 * entrega el backend nunca incluyen contraseñas, códigos ni cookies. No existe ninguna acción de edición ni eliminación.
 */
const { nameOf } = useDirectory();
const action = ref<string | null>(null);
const targetType = ref<string | null>(null);
const page = ref(1);
watch([action, targetType], () => { page.value = 1; });
const query = useAudit(() => ({ page: page.value, limit: 20, action: action.value ?? undefined, targetType: targetType.value ?? undefined }));
const selected = ref<AuditEntry | null>(null);
const drawer = computed({ get: () => Boolean(selected.value), set: (v: boolean) => { if (!v) selected.value = null; } });

const actionOptions = Object.entries(AUDIT_ACTIONS).map(([value, label]) => ({ value, label }));
const targetOptions = Object.keys(TARGET_TYPES).map((key) => ({ value: key.toUpperCase(), label: TARGET_TYPES[key]! }));
const columns: ColumnDef[] = [
  { field: 'createdAt', header: 'Fecha y hora' }, { field: 'action', header: 'Evento' }, { field: 'actorUserId', header: 'Actor', minScreen: 'md' },
  { field: 'targetType', header: 'Recurso', minScreen: 'lg' }, { field: 'result', header: 'Resultado', minScreen: 'sm' }
];
const rows = computed(() => (query.data.value?.items ?? []).map((e) => ({ ...e, result: auditResult(e.metadata) })));
const actorName = (id: string | null) => (id ? nameOf(id) : 'Sin sesión');
</script>

<template>
  <div>
    <PageHeader title="Auditoría" description="Registro de eventos de seguridad: ingresos, cambios de cuentas, accesos denegados y operaciones sobre expedientes.">
      <template #badges><span class="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"><AppIcon name="lock" :size="13" />Solo lectura</span></template>
    </PageHeader>

    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Eventos de auditoría">
      <div class="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <FormField id="aud-tipo" label="Evento"><template #default="{ id }"><Select v-model="action" :input-id="id" :options="actionOptions" option-label="label" option-value="value" placeholder="Todos" show-clear filter class="w-full" /></template></FormField>
        <FormField id="aud-recurso" label="Recurso"><template #default="{ id }"><Select v-model="targetType" :input-id="id" :options="targetOptions" option-label="label" option-value="value" placeholder="Todos" show-clear filter class="w-full" /></template></FormField>
        <p class="pb-2 text-sm tabular-nums text-slate-500" aria-live="polite">{{ query.data.value ? `${query.data.value.total} eventos` : '' }}</p>
      </div>
      <QueryState :data="query.data.value?.items" :is-pending="query.isPending.value" :error="query.error.value" subject="los eventos de auditoría" empty-icon="history" empty-title="No hay eventos" empty-description="Ningún evento coincide con los filtros." :is-empty="(items) => items.length === 0" @retry="query.refetch()">
        <template #default>
          <AppTable :rows="rows" :columns="columns" label="Eventos de auditoría" :total="query.data.value?.total" :page="page" :limit="20" :loading="query.isFetching.value" @page="page = $event">
            <template #cell-createdAt="{ row }"><span class="whitespace-nowrap tabular-nums text-slate-700">{{ formatDateTime(row.createdAt) }}</span></template>
            <template #cell-action="{ row }"><span class="font-medium text-slate-900">{{ auditActionLabel(row.action) }}</span></template>
            <template #cell-actorUserId="{ row }">{{ actorName(row.actorUserId) }}</template>
            <template #cell-targetType="{ row }">{{ targetTypeLabel(row.targetType) }}</template>
            <template #cell-result="{ row }"><StatusBadge v-if="row.result" :status="row.result" /><span v-else class="text-slate-500">—</span></template>
            <template #actions="{ row }"><button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100" :aria-label="`Ver detalle del evento ${auditActionLabel(row.action)}`" @click="selected = row"><AppIcon name="chevron-right" :size="17" /></button></template>
          </AppTable>
        </template>
      </QueryState>
    </section>

    <Drawer v-model:visible="drawer" position="right" header="Detalle del evento" class="!w-full sm:!w-[28rem]">
      <DetailPanel v-if="selected" :columns="1" :items="[
        { key: 'action', label: 'Evento', value: auditActionLabel(selected.action) }, { key: 'code', label: 'Código', value: selected.action }, { key: 'date', label: 'Fecha y hora', value: formatDateTime(selected.createdAt) },
        { key: 'actor', label: 'Actor', value: actorName(selected.actorUserId) }, { key: 'target', label: 'Recurso', value: `${targetTypeLabel(selected.targetType)}${selected.targetId ? ` (${selected.targetId})` : ''}` },
        { key: 'meta', label: 'Metadatos', wide: true }
      ]">
        <template #item-meta><pre class="max-h-72 overflow-auto rounded-md bg-slate-50 p-3 text-xs text-slate-800">{{ selected.metadata ? JSON.stringify(selected.metadata, null, 2) : 'Sin metadatos' }}</pre></template>
      </DetailPanel>
      <p class="mt-8 text-xs leading-relaxed text-slate-500">Los metadatos nunca incluyen contraseñas, códigos ni cookies. Los registros de auditoría no pueden editarse ni eliminarse.</p>
    </Drawer>
  </div>
</template>
