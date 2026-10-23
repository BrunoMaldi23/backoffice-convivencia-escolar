<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue';
import ResourceForm from '@/components/ResourceForm.vue';
import { measureFormSections } from './measures.config';
</script>

<template>
  <div class="max-w-4xl">
    <PageHeader title="Nueva medida de resguardo" description="Registre la medida acordada por el equipo de convivencia para un caso." :back="{ to: { name: 'measures' }, label: 'Volver a medidas' }" />
    <ResourceForm :sections="measureFormSections" resource="measures" submit-label="Registrar medida" action-name="el registro de la medida" :cancel-to="{ name: 'measures' }" id-prefix="medida" />
  </div>
</template>
