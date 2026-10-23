<script setup lang="ts">
import { computed } from 'vue';
import { useResource } from '@/composables/useResource';
import type { ListResourceName } from '@/types/models';
import QueryState from './QueryState.vue';
import ResourceTable from './ResourceTable.vue';
import type { ColumnDef } from './types';

/** Registros de otro recurso vinculados a un expediente (por ejemplo, entrevistas de un caso). */
const props = withDefaults(defineProps<{
  resource: ListResourceName; field: string; value: string; columns: ColumnDef[]; detailRoute?: string; label: string; emptyTitle: string; emptyDescription?: string; emptyIcon?: string;
}>(), { detailRoute: undefined, emptyDescription: undefined, emptyIcon: 'folder' });
const query = useResource(props.resource);
const rows = computed(() => ((query.data.value ?? []) as unknown as Record<string, unknown>[]).filter((r) => r[props.field] === props.value));
</script>

<template>
  <QueryState
    :data="query.data.value ? rows : undefined" :is-pending="query.isPending.value" :error="query.error.value" compact :rows="3"
    :empty-title="emptyTitle" :empty-description="emptyDescription" :empty-icon="emptyIcon" :subject="label.toLowerCase()" @retry="query.refetch()"
  >
    <template #default="{ data }"><ResourceTable :rows="data" :columns="columns" :detail-route="detailRoute" :label="label" :page-size="5" /></template>
    <template #empty-actions><slot name="empty-actions" /></template>
  </QueryState>
</template>
