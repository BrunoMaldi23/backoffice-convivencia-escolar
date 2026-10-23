<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue';
import ResourceForm from '@/components/ResourceForm.vue';
import { complaintFormSections } from './complaints.config';
</script>

<template>
  <div class="max-w-4xl">
    <PageHeader
      title="Registrar denuncia" description="Formulario interno para registrar lo informado por estudiantes, apoderados o funcionarios."
      :back="{ to: { name: 'complaints' }, label: 'Volver a denuncias' }"
    />
    <ResourceForm :sections="complaintFormSections" resource="complaints" submit-label="Registrar denuncia" action-name="el registro de la denuncia" :cancel-to="{ name: 'complaints' }" id-prefix="denuncia" />
  </div>
</template>
