<script setup lang="ts">
import { ref } from 'vue';
import SelectButton from 'primevue/selectbutton';
import ResourceListPage from '@/components/ResourceListPage.vue';
import { documentColumns, documentFilters, templateColumns } from './documents.config';

const view = ref<'library' | 'templates'>('library');
const VIEWS = [{ label: 'Biblioteca', value: 'library' }, { label: 'Plantillas', value: 'templates' }];
</script>

<template>
  <ResourceListPage
    v-if="view === 'library'" key="library" resource="documents" title="Documentos" description="Actas, informes y registros generados en la gestión de convivencia. El acceso depende del caso y del rol."
    :columns="documentColumns" :filters="documentFilters" :search-fields="['title', 'category', 'caseFolio']" search-placeholder="Buscar documento o caso"
    detail-route="documents-detail" subject="los documentos" empty-icon="file" empty-title="No hay documentos"
  >
    <template #actions><SelectButton v-model="view" :options="VIEWS" option-label="label" option-value="value" :allow-empty="false" aria-label="Sección de documentos" /></template>
  </ResourceListPage>
  <ResourceListPage
    v-else key="templates" resource="templates" title="Documentos" description="Plantillas institucionales para actas, citaciones e informes."
    :columns="templateColumns" :search-fields="['name', 'category']" search-placeholder="Buscar plantilla" subject="las plantillas" empty-icon="file" empty-title="No hay plantillas"
  >
    <template #actions><SelectButton v-model="view" :options="VIEWS" option-label="label" option-value="value" :allow-empty="false" aria-label="Sección de documentos" /></template>
  </ResourceListPage>
</template>
