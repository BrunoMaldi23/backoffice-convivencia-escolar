<script setup lang="ts">
import StatusPanel from './StatusPanel.vue';
</script>

<template>
  <StatusPanel
    icon="lock" code="403" title="Acceso denegado"
    description="Su cuenta no tiene permisos para ver esta sección. Si necesita acceso, solicítelo a la administración del sistema."
    :action="{ to: '/', label: 'Ir al panel de inicio' }"
  />
</template>
