<script setup lang="ts">
import { computed, ref } from 'vue';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import DatePicker from 'primevue/datepicker';
import Drawer from 'primevue/drawer';
import Select from 'primevue/select';
import AppIcon from '@/components/AppIcon.vue';
import DetailPanel from '@/components/DetailPanel.vue';
import FormField from '@/components/FormField.vue';
import PageHeader from '@/components/PageHeader.vue';
import PreviewBadge from '@/components/PreviewBadge.vue';
import QueryState from '@/components/QueryState.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { useResource } from '@/composables/useResource';
import { AUDIT_ACTIONS, auditActionLabel, TARGET_TYPES, targetTypeLabel } from '@/lib/audit';
import { formatDateTime } from '@/lib/format';
import { optionsFrom } from '@/lib/status';
import type { AuditEvent } from '@/types/models';

/** Auditoría de seguridad: solo lectura. No hay acciones de edición ni eliminación. */
const query = useResource('audit');
const action = ref<string | null>(null);
const targetType = ref<string | null>(null);
const result = ref<string | null>(null);
const range = ref<(Date | null)[] | null>(null);
const selected = ref<AuditEvent | null>(null);

const actionOptions = Object.entries(AUDIT_ACTIONS).map(([value, label]) => ({ value, label }));
const targetOptions = Object.entries(TARGET_TYPES).map(([value, label]) => ({ value, label }));
const rows = computed(() => (query.data.value ?? []).filter((e) => {
  const [from, to] = range.value ?? [];
  const at = new Date(e.createdAt);
  return (!action.value || e.action === action.value) && (!targetType.value || e.targetType === targetType.value) && (!result.value || e.result === result.value)
    && (!from || at >= from) && (!to || at <= new Date(to.getTime() + 86_399_999));
}));
</script>

<template>
  <div>
    <PageHeader title="Auditoría" description="Registro inalterable de eventos de seguridad: ingresos, cambios de cuentas y accesos denegados.">
      <template #badges>
        <span class="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"><AppIcon name="lock" :size="13" />Solo lectura</span>
        <PreviewBadge />
      </template>
    </PageHeader>

    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Eventos de auditoría">
      <div class="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 xl:grid-cols-4">
        <FormField id="aud-fechas" label="Fechas">
          <template #default="{ id }"><DatePicker v-model="range" :input-id="id" selection-mode="range" date-format="dd-mm-yy" placeholder="Todas" show-icon icon-display="input" class="w-full" /></template>
        </FormField>
        <FormField id="aud-tipo" label="Tipo de evento">
          <template #default="{ id }"><Select v-model="action" :input-id="id" :options="actionOptions" option-label="label" option-value="value" placeholder="Todos" show-clear filter class="w-full" /></template>
        </FormField>
        <FormField id="aud-recurso" label="Recurso">
          <template #default="{ id }"><Select v-model="targetType" :input-id="id" :options="targetOptions" option-label="label" option-value="value" placeholder="Todos" show-clear class="w-full" /></template>
        </FormField>
        <FormField id="aud-resultado" label="Resultado">
          <template #default="{ id }"><Select v-model="result" :input-id="id" :options="optionsFrom(['exito', 'denegado', 'error'])" option-label="label" option-value="value" placeholder="Todos" show-clear class="w-full" /></template>
        </FormField>
      </div>

      <QueryState :data="query.data.value" :is-pending="query.isPending.value" :error="query.error.value" subject="los eventos de auditoría" empty-icon="history" empty-title="No hay eventos registrados" @retry="query.refetch()">
        <DataTable
          :value="rows" data-key="id" paginator :rows="15" paginator-template="PrevPageLink PageLinks NextPageLink CurrentPageReport"
          current-page-report-template="{first}–{last} de {totalRecords}" :pt="{ table: { 'aria-label': 'Eventos de auditoría' } }" class="text-sm"
        >
          <template #empty><p class="py-8 text-center text-slate-600">Ningún evento coincide con los filtros.</p></template>
          <Column field="createdAt" header="Fecha y hora" sortable>
            <template #body="{ data }"><span class="whitespace-nowrap tabular-nums text-slate-700">{{ formatDateTime(data.createdAt) }}</span></template>
          </Column>
          <Column field="action" header="Evento" sortable>
            <template #body="{ data }"><span class="font-medium text-slate-900">{{ auditActionLabel(data.action) }}</span></template>
          </Column>
          <Column field="actor" header="Actor" header-class="hidden md:table-cell" body-class="hidden md:table-cell" />
          <Column field="targetType" header="Recurso" header-class="hidden lg:table-cell" body-class="hidden lg:table-cell">
            <template #body="{ data }"><span class="text-slate-700">{{ targetTypeLabel(data.targetType) }}</span></template>
          </Column>
          <Column field="result" header="Resultado"><template #body="{ data }"><StatusBadge :status="data.result" /></template></Column>
          <Column header="Detalle" header-class="w-px">
            <template #body="{ data }">
              <button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100" :aria-label="`Ver detalle del evento ${auditActionLabel(data.action)}`" @click="selected = data">
                <AppIcon name="chevron-right" :size="17" />
              </button>
            </template>
          </Column>
        </DataTable>
      </QueryState>
    </section>

    <Drawer :visible="Boolean(selected)" position="right" header="Detalle del evento" class="!w-full sm:!w-[28rem]" @update:visible="(v) => { if (!v) selected = null; }">
      <DetailPanel v-if="selected" :columns="1" :items="[
        { key: 'action', label: 'Evento', value: auditActionLabel(selected.action) }, { key: 'code', label: 'Código', value: selected.action },
        { key: 'date', label: 'Fecha y hora', value: formatDateTime(selected.createdAt) }, { key: 'actor', label: 'Actor', value: selected.actor },
        { key: 'target', label: 'Recurso', value: `${targetTypeLabel(selected.targetType)} (${selected.targetId})` }, { key: 'result', label: 'Resultado' },
        { key: 'detail', label: 'Metadatos', value: selected.detail }
      ]">
        <template #item-result><StatusBadge :status="selected.result" /></template>
      </DetailPanel>
      <p class="mt-8 text-xs leading-relaxed text-slate-500">Los metadatos nunca incluyen contraseñas, códigos ni cookies. Los registros de auditoría no pueden editarse ni eliminarse.</p>
    </Drawer>
  </div>
</template>
