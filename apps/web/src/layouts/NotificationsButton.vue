<script setup lang="ts">
import { ref } from 'vue';
import Popover from 'primevue/popover';
import AppIcon from '@/components/AppIcon.vue';
import EmptyState from '@/components/EmptyState.vue';

/** Centro de notificaciones visual. Sin endpoint de notificaciones todavía, muestra un estado vacío honesto. */
const panel = ref<InstanceType<typeof Popover> | null>(null);
</script>

<template>
  <div>
    <button
      type="button" class="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      aria-label="Notificaciones" aria-haspopup="dialog" @click="panel?.toggle($event)"
    >
      <AppIcon name="bell" :size="19" />
    </button>
    <Popover ref="panel" :pt="{ content: { class: 'p-0' } }">
      <div class="w-80">
        <p class="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">Notificaciones</p>
        <EmptyState compact icon="bell" title="Sin notificaciones" description="Las alertas de casos, tareas y citaciones aparecerán aquí cuando el servicio esté disponible." />
      </div>
    </Popover>
  </div>
</template>
