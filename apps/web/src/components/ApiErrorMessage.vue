<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';
import Message from 'primevue/message';
import { describeError, isConflict } from '@/lib/errors';

/**
 * Error de una operación contra la API. Un 409 (versión obsoleta o regla de estado) ofrece "Recargar datos", que vuelve a
 * leer el registro desde el servidor antes de reintentar; nunca se reintenta una escritura automáticamente.
 */
const props = defineProps<{ error: unknown }>();
const emit = defineEmits<{ reload: [] }>();
const conflict = computed(() => isConflict(props.error));
</script>

<template>
  <Message v-if="error" :severity="conflict ? 'warn' : 'error'" :closable="false" role="alert">
    <span class="block">{{ describeError(error) }}</span>
    <Button v-if="conflict" label="Recargar datos" size="small" severity="secondary" outlined class="mt-2" @click="emit('reload')" />
  </Message>
</template>
