<script setup lang="ts">
import ResourceListPage from '@/components/ResourceListPage.vue';
import { referralColumns, referralFilters } from './referrals.config';
</script>

<template>
  <ResourceListPage
    resource="referrals" title="Derivaciones" description="Derivaciones a instituciones de salud, protección y apoyo psicosocial."
    :columns="referralColumns" :filters="referralFilters" :search-fields="['folio', 'institution', 'caseFolio', 'responsible']" search-placeholder="Buscar por folio, institución o caso"
    detail-route="referrals-detail" :create="{ to: { name: 'referrals-new' }, label: 'Nueva derivación' }" subject="las derivaciones" empty-icon="referral" empty-title="No hay derivaciones registradas"
  />
</template>
