<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue';
import ResourceForm from '@/components/ResourceForm.vue';
import { taskFormSections } from './tasks.config';
</script>

<template>
  <div class="max-w-4xl">
    <PageHeader title="Nueva tarea" description="Asigne una tarea a un integrante del equipo, con o sin caso asociado." :back="{ to: { name: 'tasks' }, label: 'Volver a tareas' }" />
    <ResourceForm :sections="taskFormSections" resource="tasks" submit-label="Crear tarea" action-name="la creación de la tarea" :cancel-to="{ name: 'tasks' }" id-prefix="tarea" />
  </div>
</template>
