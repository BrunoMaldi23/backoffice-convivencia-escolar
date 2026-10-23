<script setup lang="ts">
import InstitutionLogo from '@/components/InstitutionLogo.vue';
import StatusPanel from './auth/StatusPanel.vue';
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-white px-5 py-12">
    <div class="w-full max-w-md">
      <div class="mb-10"><InstitutionLogo variant="emblem" :size="64" /></div>
      <StatusPanel
        icon="search" code="404" title="Página no encontrada"
        description="La dirección no existe o cambió. Revise el enlace o vuelva al panel de inicio."
        :action="{ to: '/', label: 'Volver al inicio' }"
      />
    </div>
  </main>
</template>
