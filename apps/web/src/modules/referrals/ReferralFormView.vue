<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue';
import ResourceForm from '@/components/ResourceForm.vue';
import { referralFormSections } from './referrals.config';
</script>

<template>
  <div class="max-w-4xl">
    <PageHeader title="Nueva derivación" description="Registre la derivación de un caso a una institución externa." :back="{ to: { name: 'referrals' }, label: 'Volver a derivaciones' }" />
    <ResourceForm :sections="referralFormSections" resource="referrals" submit-label="Registrar derivación" action-name="el registro de la derivación" :cancel-to="{ name: 'referrals' }" id-prefix="derivacion" />
  </div>
</template>
