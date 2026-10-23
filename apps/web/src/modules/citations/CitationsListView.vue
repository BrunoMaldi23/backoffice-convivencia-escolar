<script setup lang="ts">
import ResourceListPage from '@/components/ResourceListPage.vue';
import { citationColumns, citationFilters } from './citations.config';
</script>

<template>
  <ResourceListPage
    resource="citations" title="Citaciones" description="Citaciones a apoderados y tutores, con su confirmación y asistencia."
    :columns="citationColumns" :filters="citationFilters" :search-fields="['folio', 'caseFolio', 'recipient']" search-placeholder="Buscar por folio o caso"
    detail-route="citations-detail" :create="{ to: { name: 'citations-new' }, label: 'Nueva citación' }" subject="las citaciones" empty-icon="mail" empty-title="No hay citaciones registradas"
  />
</template>
