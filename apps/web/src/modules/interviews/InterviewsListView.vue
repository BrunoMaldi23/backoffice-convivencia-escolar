<script setup lang="ts">
import ResourceListPage from '@/components/ResourceListPage.vue';
import { interviewColumns, interviewFilters } from './interviews.config';
</script>

<template>
  <ResourceListPage
    resource="interviews" title="Entrevistas" description="Entrevistas con estudiantes, apoderados y funcionarios en el marco de un caso."
    :columns="interviewColumns" :filters="interviewFilters" :search-fields="['folio', 'caseFolio', 'participant', 'interviewer']" search-placeholder="Buscar por folio, caso o participante"
    detail-route="interviews-detail" :create="{ to: { name: 'interviews-new' }, label: 'Nueva entrevista' }" subject="las entrevistas" empty-icon="message" empty-title="No hay entrevistas registradas"
  />
</template>
