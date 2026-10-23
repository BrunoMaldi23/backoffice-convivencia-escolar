<script setup lang="ts">
import { computed } from 'vue';
import { useHealth } from '@/composables/useHealth';
const health = useHealth();
const databaseStatus = computed(() => health.data.value?.database);
</script>
<template>
  <section class="mx-auto max-w-4xl">
    <p class="text-sm font-medium text-sky-700">Diagnóstico técnico</p>
    <h1 class="mt-2 text-2xl font-bold tracking-tight text-slate-900">Estado del servicio</h1>
    <p class="mt-3 max-w-2xl text-slate-600">Conexión entre la interfaz, la API y la base de datos.</p>
    <div class="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 class="font-semibold text-slate-900">Conexión con la API</h2>
      <p v-if="health.isPending" class="mt-2 text-sm text-slate-500">Comprobando servicio…</p>
      <p v-else-if="health.isSuccess" class="mt-2 text-sm text-emerald-700">API disponible · PostgreSQL {{ databaseStatus }}</p>
      <p v-else class="mt-2 text-sm text-amber-700">API no disponible. Inicie los servicios con Docker Compose.</p>
    </div>
  </section>
</template>
