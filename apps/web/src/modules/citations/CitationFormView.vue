<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue';
import ResourceForm from '@/components/ResourceForm.vue';
import { citationFormSections } from './citations.config';
</script>

<template>
  <div class="max-w-4xl">
    <PageHeader title="Nueva citación" description="Registre una citación a apoderado o tutor/a legal." :back="{ to: { name: 'citations' }, label: 'Volver a citaciones' }" />
    <ResourceForm :sections="citationFormSections" resource="citations" submit-label="Registrar citación" action-name="el registro de la citación" :cancel-to="{ name: 'citations' }" id-prefix="citacion" />
  </div>
</template>
