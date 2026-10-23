<script setup lang="ts">
import ResourceListPage from '@/components/ResourceListPage.vue';
import { caseColumns } from './cases.config';

const columns = caseColumns.map((c) => (c.field === 'updatedAt' ? { ...c, header: 'Fecha de cierre', kind: 'date' as const } : c)).filter((c) => c.field !== 'status');
</script>

<template>
  <ResourceListPage
    resource="closedCases" title="Casos cerrados" description="Historial de casos finalizados. Son de solo lectura; una reapertura deberá registrarse con su justificación."
    :columns="columns" :search-fields="['folio', 'type', 'course']" search-placeholder="Buscar por folio, tipo o curso"
    detail-route="cases-detail" subject="los casos cerrados" empty-icon="check-circle" empty-title="No hay casos cerrados"
  />
</template>
