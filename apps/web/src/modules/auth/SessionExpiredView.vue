<script setup lang="ts">
import StatusPanel from './StatusPanel.vue';
</script>

<template>
  <StatusPanel
    icon="clock" tone="warning" title="Su sesión expiró"
    description="Por seguridad, la sesión se cierra después de un tiempo o cuando un administrador revoca el acceso. Inicie sesión nuevamente para continuar."
    :action="{ to: { name: 'login' }, label: 'Iniciar sesión' }"
  />
</template>
