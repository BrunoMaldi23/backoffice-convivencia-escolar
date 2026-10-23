<script setup lang="ts">
import { RouterLink } from 'vue-router';
import Button from 'primevue/button';
import ResourceListPage from '@/components/ResourceListPage.vue';
import { caseColumns, caseFilters } from './cases.config';
</script>

<template>
  <ResourceListPage
    resource="cases" title="Casos" description="Casos de convivencia escolar en curso. Los casos cerrados se consultan por separado."
    :columns="caseColumns" :filters="caseFilters" :search-fields="['folio', 'type', 'course', 'responsible']" search-placeholder="Buscar por folio, tipo o curso"
    detail-route="cases-detail" :create="{ to: { name: 'cases-new' }, label: 'Nuevo caso' }" subject="los casos"
    empty-title="No hay casos en curso" empty-description="Cuando se registre un caso, aparecerá en esta lista con su prioridad y estado."
  >
    <template #actions>
      <RouterLink :to="{ name: 'cases-closed' }" custom>
        <template #default="{ navigate, href }"><Button as="a" :href="href" label="Casos cerrados" severity="secondary" outlined @click="navigate" /></template>
      </RouterLink>
    </template>
  </ResourceListPage>
</template>
