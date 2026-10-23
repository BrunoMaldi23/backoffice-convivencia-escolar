<script setup lang="ts">
import type { ScopedResult } from '@/composables/useScoped';
import AppIcon from './AppIcon.vue';

/**
 * Aclara de cuántos expedientes provienen los datos de una vista global. La API entrega estos datos solo por expediente,
 * así que cuando hay más expedientes que los revisados se indica explícitamente (nunca se presenta como total).
 */
defineProps<{ result: ScopedResult<unknown>; noun?: string }>();
</script>

<template>
  <p class="mb-4 flex items-start gap-2 text-xs leading-relaxed text-slate-500">
    <AppIcon name="info" :size="14" class="mt-0.5 shrink-0" />
    <span v-if="result.truncated">
      {{ noun ?? 'Datos' }} de los {{ result.scanned }} expedientes abiertos más recientes de {{ result.eligible }}. Para ver el resto, abra cada expediente.
    </span>
    <span v-else>{{ noun ?? 'Datos' }} de {{ result.scanned }} {{ result.scanned === 1 ? 'expediente' : 'expedientes' }}.</span>
  </p>
</template>
