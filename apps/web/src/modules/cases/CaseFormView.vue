<script setup lang="ts">
import { computed } from 'vue';
import PageHeader from '@/components/PageHeader.vue';
import ResourceForm from '@/components/ResourceForm.vue';
import { caseFormSections } from './cases.config';

/** Crear o editar un caso. En edición, los valores se cargarán desde `GET` del caso cuando exista el endpoint. */
const props = defineProps<{ id?: string }>();
const editing = computed(() => Boolean(props.id));
</script>

<template>
  <div class="max-w-4xl">
    <PageHeader
      :title="editing ? 'Editar caso' : 'Nuevo caso'"
      :description="editing ? 'Actualice la información del caso. Los cambios quedarán registrados en la bitácora.' : 'Registre un caso de convivencia escolar. Los campos con asterisco son obligatorios.'"
      :back="editing ? { to: { name: 'cases-detail', params: { id } }, label: 'Volver al expediente' } : { to: { name: 'cases' }, label: 'Volver a casos' }"
    />
    <ResourceForm
      :sections="caseFormSections" resource="cases" :method="editing ? 'PATCH' : 'POST'" :submit-label="editing ? 'Guardar cambios' : 'Registrar caso'"
      action-name="el registro del caso" :cancel-to="editing ? { name: 'cases-detail', params: { id } } : { name: 'cases' }" id-prefix="caso"
    />
  </div>
</template>
