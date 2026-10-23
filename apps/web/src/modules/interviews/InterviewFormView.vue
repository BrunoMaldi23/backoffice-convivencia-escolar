<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue';
import ResourceForm from '@/components/ResourceForm.vue';
import { interviewFormSections } from './interviews.config';
</script>

<template>
  <div class="max-w-4xl">
    <PageHeader title="Nueva entrevista" description="Programe una entrevista. El registro y los acuerdos se completan desde su detalle." :back="{ to: { name: 'interviews' }, label: 'Volver a entrevistas' }" />
    <ResourceForm :sections="interviewFormSections" resource="interviews" submit-label="Programar entrevista" action-name="la programación de la entrevista" :cancel-to="{ name: 'interviews' }" id-prefix="entrevista" />
  </div>
</template>
