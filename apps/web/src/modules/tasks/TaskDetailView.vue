<script setup lang="ts">
import { ref } from 'vue';
import Button from 'primevue/button';
import ConfirmActionDialog from '@/components/ConfirmActionDialog.vue';
import DetailPanel from '@/components/DetailPanel.vue';
import EmptyState from '@/components/EmptyState.vue';
import PriorityBadge from '@/components/PriorityBadge.vue';
import ResourceDetailShell from '@/components/ResourceDetailShell.vue';
import SectionCard from '@/components/SectionCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { formatDate } from '@/lib/format';
import { submitResource } from '@/services/resources';

defineProps<{ id: string }>();
const completeOpen = ref(false);
</script>

<template>
  <ResourceDetailShell :id="id" resource="tasks" subject="la tarea" :back="{ to: { name: 'tasks' }, label: 'Volver a tareas' }" :title="(t) => t.title" :description="(t) => `Vence el ${formatDate(t.dueDate)}.`">
    <template #badges="{ item }"><StatusBadge :status="item.status" /></template>
    <template #actions="{ item }"><Button v-if="item.status !== 'completada'" label="Marcar como completada" @click="completeOpen = true" /></template>
    <template #default="{ item }">
      <div class="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Detalle" class="lg:col-span-2">
          <DetailPanel :items="[
            { key: 'title', label: 'Tarea', value: item.title, wide: true }, { key: 'case', label: 'Caso asociado', value: item.caseFolio ?? 'Sin caso asociado' },
            { key: 'responsible', label: 'Responsable', value: item.responsible }, { key: 'priority', label: 'Prioridad' }, { key: 'due', label: 'Vencimiento', value: formatDate(item.dueDate) }
          ]">
            <template #item-priority><PriorityBadge :priority="item.priority" /></template>
          </DetailPanel>
        </SectionCard>
        <SectionCard title="Comentarios">
          <EmptyState compact icon="message" title="Sin comentarios" description="Los comentarios del equipo se registrarán al conectar el módulo." />
        </SectionCard>
      </div>
      <ConfirmActionDialog
        v-model:visible="completeOpen" header="Completar tarea" confirm-label="Marcar como completada" action-name="el cambio de estado"
        :message="`La tarea «${item.title}» quedará como completada.`" :action="() => submitResource('tasks', 'PATCH', `/${item.id}`)"
      />
    </template>
  </ResourceDetailShell>
</template>
