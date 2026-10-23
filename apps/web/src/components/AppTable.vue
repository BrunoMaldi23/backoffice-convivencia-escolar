<script setup lang="ts" generic="Row extends object">
import { computed } from 'vue';
import { RouterLink, type RouteLocationRaw } from 'vue-router';
import Column from 'primevue/column';
import DataTable, { type DataTablePageEvent } from 'primevue/datatable';
import AppIcon from './AppIcon.vue';
import type { ColumnDef } from './types';

/**
 * Tabla de listados sobre PrimeVue DataTable. Dos modos:
 * - Cliente (por defecto): pagina y ordena los `rows` recibidos.
 * - Servidor: si se pasa `total`, la paginación es perezosa (`page`/`limit` los controla quien consume y se emite `page`).
 * Las celdas se personalizan con el slot `cell-<campo>`; `rowTo` convierte la primera columna en enlace al detalle.
 */
const props = withDefaults(defineProps<{
  rows: Row[]; columns: ColumnDef[]; label: string; rowKey?: string; loading?: boolean; total?: number; page?: number; limit?: number; pageSize?: number;
  rowTo?: (row: Row) => RouteLocationRaw; detailLabel?: (row: Row) => string;
}>(), { rowKey: 'id', loading: false, total: undefined, page: 1, limit: 20, pageSize: 10, rowTo: undefined, detailLabel: undefined });
const emit = defineEmits<{ page: [page: number] }>();

const HIDE = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell', xl: 'hidden xl:table-cell' } as const;
const classes = (col: ColumnDef) => [col.minScreen ? HIDE[col.minScreen] : '', col.align === 'right' ? 'text-right' : ''].filter(Boolean).join(' ');
const lazy = computed(() => props.total !== undefined);
const perPage = computed(() => (lazy.value ? props.limit : props.pageSize));
const cell = (row: Row, field: string): unknown => (row as Record<string, unknown>)[field];
const text = (value: unknown) => (value === null || value === undefined || value === '' ? '—' : String(value));
const onPage = (event: DataTablePageEvent) => emit('page', event.page + 1);
</script>

<template>
  <DataTable
    :value="rows" :data-key="rowKey" :loading="loading" :lazy="lazy" :total-records="lazy ? total : undefined" :first="lazy ? (page - 1) * limit : undefined"
    :paginator="(total ?? rows.length) > perPage" :rows="perPage" :removable-sort="!lazy"
    paginator-template="PrevPageLink PageLinks NextPageLink CurrentPageReport" current-page-report-template="{first}–{last} de {totalRecords}"
    :pt="{ table: { 'aria-label': label } }" scrollable class="text-sm" @page="onPage"
  >
    <Column v-for="(col, index) in columns" :key="col.field" :field="col.field" :header="col.header" :sortable="!lazy && col.sortable" :header-class="classes(col)" :body-class="classes(col)">
      <template #body="{ data }">
        <RouterLink v-if="index === 0 && rowTo" :to="rowTo(data as Row)" class="rounded font-medium text-sky-800 hover:underline">
          <slot :name="`cell-${col.field}`" :row="data as Row" :value="cell(data as Row, col.field)">{{ text(cell(data as Row, col.field)) }}</slot>
        </RouterLink>
        <slot v-else :name="`cell-${col.field}`" :row="data as Row" :value="cell(data as Row, col.field)">{{ text(cell(data as Row, col.field)) }}</slot>
      </template>
    </Column>
    <Column v-if="rowTo || $slots.actions" header="Acciones" header-class="w-px text-right" body-class="text-right">
      <template #body="{ data }">
        <div class="flex justify-end gap-1">
          <slot name="actions" :row="data as Row" />
          <RouterLink
            v-if="rowTo" :to="rowTo(data as Row)" class="inline-flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
            :aria-label="detailLabel ? detailLabel(data as Row) : 'Ver detalle'" :title="detailLabel ? detailLabel(data as Row) : 'Ver detalle'"
          ><AppIcon name="eye" :size="17" /></RouterLink>
        </div>
      </template>
    </Column>
    <template #empty><slot name="empty"><p class="py-8 text-center text-slate-600">Sin resultados.</p></slot></template>
  </DataTable>
</template>
