<script setup lang="ts">
import ResourceListPage from '@/components/ResourceListPage.vue';
import { complaintColumns, complaintFilters } from './complaints.config';
</script>

<template>
  <ResourceListPage
    resource="complaints" title="Denuncias" description="Denuncias recibidas por canales internos del establecimiento, con su clasificación y estado de revisión."
    :columns="complaintColumns" :filters="complaintFilters" :search-fields="['folio', 'category', 'classification', 'assignedTo']" search-placeholder="Buscar por folio o categoría"
    detail-route="complaints-detail" :create="{ to: { name: 'complaints-new' }, label: 'Registrar denuncia' }" subject="las denuncias" empty-icon="megaphone"
    empty-title="No hay denuncias registradas" empty-description="Las denuncias recibidas presencialmente o por canales internos se registran desde aquí."
  />
</template>
