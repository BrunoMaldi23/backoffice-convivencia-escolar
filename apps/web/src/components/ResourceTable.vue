<script setup lang="ts">
import { RouterLink } from 'vue-router';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import { formatDate, formatDateTime } from '@/lib/format';
import { roleLabel } from '@/lib/roles';
import type { Priority } from '@/types/models';
import AppIcon from './AppIcon.vue';
import PriorityBadge from './PriorityBadge.vue';
import StatusBadge from './StatusBadge.vue';
import type { ColumnDef } from './types';

/**
 * Tabla de listados basada en PrimeVue DataTable: ordenamiento, paginación y columnas que se ocultan
 * en pantallas pequeñas. La primera columna enlaza al detalle cuando existe `detailRoute`.
 */
type Row = Record<string, unknown>;
withDefaults(defineProps<{ rows: Row[]; columns: ColumnDef[]; detailRoute?: string; idField?: string; label: string; pageSize?: number }>(), { detailRoute: undefined, idField: 'id', pageSize: 10 });

const HIDE: Record<NonNullable<ColumnDef['minScreen']>, string> = {
  sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell', xl: 'hidden xl:table-cell'
};
const cls = (col: ColumnDef) => (col.minScreen ? HIDE[col.minScreen] : '');
const text = (value: unknown) => (value === null || value === undefined || value === '' ? '—' : String(value));
</script>

<template>
  <DataTable
    :value="rows" :data-key="idField" :paginator="rows.length > pageSize" :rows="pageSize" removable-sort
    paginator-template="PrevPageLink PageLinks NextPageLink CurrentPageReport" current-page-report-template="{first}–{last} de {totalRecords}"
    :pt="{ table: { 'aria-label': label } }" table-class="min-w-full" class="text-sm" scrollable
  >
    <Column
      v-for="(col, index) in columns" :key="col.field" :field="col.field" :header="col.header" :sortable="col.sortable ?? true"
      :header-class="cls(col)" :body-class="cls(col)"
    >
      <template #body="{ data }">
        <RouterLink
          v-if="index === 0 && detailRoute" :to="{ name: detailRoute, params: { id: String(data[idField]) } }"
          :class="['rounded font-medium text-sky-800 hover:underline', col.kind === 'folio' ? 'whitespace-nowrap tabular-nums' : '']"
        >{{ text(data[col.field]) }}</RouterLink>
        <span v-else-if="col.kind === 'folio'" class="whitespace-nowrap font-medium tabular-nums text-slate-900">{{ text(data[col.field]) }}</span>
        <span v-else-if="col.kind === 'strong'" class="font-medium text-slate-900">{{ text(data[col.field]) }}</span>
        <span v-else-if="col.kind === 'date'" class="whitespace-nowrap tabular-nums text-slate-700">{{ formatDate(data[col.field] as string | null) }}</span>
        <span v-else-if="col.kind === 'datetime'" class="whitespace-nowrap tabular-nums text-slate-700">{{ formatDateTime(data[col.field] as string | null) }}</span>
        <span v-else-if="col.kind === 'number'" class="tabular-nums text-slate-700">{{ text(data[col.field]) }}</span>
        <StatusBadge v-else-if="col.kind === 'status'" :status="String(data[col.field])" />
        <PriorityBadge v-else-if="col.kind === 'priority'" :priority="data[col.field] as Priority" />
        <span v-else-if="col.kind === 'roles'" class="flex flex-wrap gap-1">
          <span v-for="r in data[col.field] as string[]" :key="r" class="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">{{ roleLabel(r) }}</span>
        </span>
        <span v-else class="text-slate-700">{{ text(data[col.field]) }}</span>
      </template>
    </Column>
    <Column
      v-if="detailRoute || $slots.actions" header="Acciones"
      :header-class="$slots.actions ? 'w-px text-right' : 'w-px text-right hidden sm:table-cell'" :body-class="$slots.actions ? 'text-right' : 'text-right hidden sm:table-cell'"
    >
      <template #body="{ data }">
        <div class="flex justify-end gap-1">
          <slot name="actions" :row="data" />
          <RouterLink
            v-if="detailRoute" :to="{ name: detailRoute, params: { id: String(data[idField]) } }"
            class="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            :aria-label="`Ver detalle de ${text(data[columns[0]!.field])}`"
          ><AppIcon name="chevron-right" :size="17" /></RouterLink>
        </div>
      </template>
    </Column>
  </DataTable>
</template>
