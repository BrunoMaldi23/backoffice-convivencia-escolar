<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, type RouteLocationRaw } from 'vue-router';
import Button from 'primevue/button';
import { useResource } from '@/composables/useResource';
import type { ListResourceName } from '@/types/models';
import AppIcon from './AppIcon.vue';
import PageHeader from './PageHeader.vue';
import PreviewBadge from './PreviewBadge.vue';
import QueryState from './QueryState.vue';
import ResourceTable from './ResourceTable.vue';
import SearchToolbar from './SearchToolbar.vue';
import type { ColumnDef, FilterDef } from './types';

/**
 * Página de listado estándar: encabezado, buscador, filtros, tabla y los cuatro estados.
 * El filtrado es local mientras no exista API; al conectar, se trasladará a parámetros de consulta del servidor.
 */
const props = withDefaults(defineProps<{
  resource: ListResourceName; title: string; description?: string; columns: ColumnDef[]; filters?: FilterDef[]; searchFields: string[];
  searchPlaceholder?: string; detailRoute?: string; create?: { to: RouteLocationRaw; label: string }; emptyTitle?: string; emptyDescription?: string;
  subject: string; emptyIcon?: string; hideHeader?: boolean; hideTable?: boolean;
}>(), {
  description: undefined, filters: () => [], searchPlaceholder: 'Buscar', detailRoute: undefined, create: undefined, emptyTitle: 'Aún no hay registros',
  emptyDescription: undefined, emptyIcon: 'folder', hideHeader: false, hideTable: false
});

const query = useResource(props.resource);
const search = ref('');
const values = ref<Record<string, string | null>>({});

const normalize = (v: unknown) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const rows = computed(() => {
  const data = (query.data.value ?? []) as unknown as Record<string, unknown>[];
  const term = normalize(search.value.trim());
  return data.filter((row) =>
    (!term || props.searchFields.some((f) => normalize(row[f]).includes(term))) &&
    Object.entries(values.value).every(([field, value]) => !value || row[field] === value)
  );
});
const filtering = computed(() => Boolean(search.value) || Object.values(values.value).some(Boolean));
</script>

<template>
  <div>
    <PageHeader v-if="!hideHeader" :title="title" :description="description">
      <template #badges><PreviewBadge /></template>
      <template #actions>
        <slot name="actions" />
        <RouterLink v-if="create" :to="create.to" custom>
          <template #default="{ navigate, href }">
            <Button as="a" :href="href" :label="create.label" @click="navigate"><template #icon><AppIcon name="plus" :size="16" /></template></Button>
          </template>
        </RouterLink>
      </template>
    </PageHeader>

    <slot name="before" />

    <section v-if="!hideTable" class="overflow-hidden rounded-xl border border-slate-200 bg-white" :aria-label="title">
      <SearchToolbar v-model:search="search" v-model:values="values" :filters="filters" :placeholder="searchPlaceholder" :total="query.data.value ? rows.length : null" />
      <QueryState
        :data="query.data.value" :is-pending="query.isPending.value" :error="query.error.value" :subject="subject"
        :empty-title="emptyTitle" :empty-description="emptyDescription" :empty-icon="emptyIcon" @retry="query.refetch()"
      >
        <template #default>
          <ResourceTable v-if="rows.length" :rows="rows" :columns="columns" :detail-route="detailRoute" :label="title">
            <template v-if="$slots['row-actions']" #actions="{ row }"><slot name="row-actions" :row="row" /></template>
          </ResourceTable>
          <div v-else-if="filtering" class="px-6 py-12 text-center">
            <p class="font-semibold text-slate-900">Sin coincidencias</p>
            <p class="mt-1 text-sm text-slate-600">Ajuste la búsqueda o limpie los filtros para ver más resultados.</p>
          </div>
        </template>
        <template #empty-actions><slot name="empty-actions" /></template>
      </QueryState>
    </section>
  </div>
</template>
