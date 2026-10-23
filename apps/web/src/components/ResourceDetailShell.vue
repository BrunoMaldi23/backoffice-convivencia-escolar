<script setup lang="ts" generic="K extends ListResourceName">
import { computed } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import { NotFoundError, useResourceItem } from '@/composables/useResource';
import type { ListResourceName, ResourceItem } from '@/types/models';
import EmptyState from './EmptyState.vue';
import ErrorState from './ErrorState.vue';
import LoadingState from './LoadingState.vue';
import PageHeader from './PageHeader.vue';
import PreviewBadge from './PreviewBadge.vue';

/** Estructura de toda vista de detalle: carga por identificador, cabecera con retorno y estados de carga, error e inexistente. */
const props = defineProps<{
  resource: K; id: string; back: { to: RouteLocationRaw; label: string }; subject: string;
  title: (item: ResourceItem<K>) => string; description?: (item: ResourceItem<K>) => string;
}>();
defineSlots<{
  default(props: { item: ResourceItem<K> }): unknown;
  badges?(props: { item: ResourceItem<K> }): unknown;
  actions?(props: { item: ResourceItem<K> }): unknown;
}>();
const query = useResourceItem(props.resource, () => props.id);
const notFound = computed(() => query.error.value instanceof NotFoundError);
</script>

<template>
  <div>
    <LoadingState v-if="query.isPending.value" :rows="6" />
    <template v-else-if="query.data.value">
      <PageHeader :title="title(query.data.value)" :description="description?.(query.data.value)" :back="back">
        <template #badges><slot name="badges" :item="query.data.value" /><PreviewBadge /></template>
        <template v-if="$slots.actions" #actions><slot name="actions" :item="query.data.value" /></template>
      </PageHeader>
      <slot :item="query.data.value" />
    </template>
    <div v-else class="rounded-xl border border-slate-200 bg-white">
      <h1 class="sr-only">{{ notFound ? `No se encontró ${subject}` : `Error al cargar ${subject}` }}</h1>
      <EmptyState v-if="notFound" icon="search" :title="`No se encontró ${subject}`" description="El registro no existe o no tiene permisos para verlo." />
      <ErrorState v-else :error="query.error.value" :subject="subject" @retry="query.refetch()" />
    </div>
  </div>
</template>
