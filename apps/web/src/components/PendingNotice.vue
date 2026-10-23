<script setup lang="ts">
import { computed } from 'vue';
import Message from 'primevue/message';
import { describeError, isIntegrationPending } from '@/lib/errors';

/** Resultado de una acción no conectada o fallida. Nunca informa éxito si el servidor no lo confirmó. */
const props = defineProps<{ error: unknown; action?: string }>();
const pending = computed(() => isIntegrationPending(props.error));
</script>

<template>
  <Message v-if="error" :severity="pending ? 'info' : 'error'" :closable="false" role="status">
    <template v-if="pending">
      <strong class="font-semibold">No se realizó {{ action ?? 'la acción' }}.</strong>
      Esta función aún no está conectada con el servidor; no se guardó ni envió información.
    </template>
    <template v-else>{{ describeError(error) }}</template>
  </Message>
</template>
