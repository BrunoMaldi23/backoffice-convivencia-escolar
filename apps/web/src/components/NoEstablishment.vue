<script setup lang="ts">
import { RouterLink } from 'vue-router';
import Button from 'primevue/button';
import { useSession } from '@/composables/useSession';
import EmptyState from './EmptyState.vue';

/**
 * Aviso cuando la persona no pertenece a ningún establecimiento: sin membresía activa la API no entrega datos del colegio.
 * La administración puede crear el establecimiento y agregar personas desde Administración → Establecimientos.
 */
const { can } = useSession();
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white">
    <EmptyState icon="building" title="Aún no pertenece a un establecimiento" description="Para ver y registrar estos datos, su cuenta debe ser miembro del establecimiento. Pida a la administración que la agregue en Administración → Establecimientos.">
      <RouterLink v-if="can('institutions.manage')" :to="{ name: 'establishments' }"><Button label="Ir a establecimientos" size="small" /></RouterLink>
    </EmptyState>
  </div>
</template>
