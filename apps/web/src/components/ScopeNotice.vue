<script setup lang="ts">
import type { ScopedResult } from '@/composables/useScoped';
import AppIcon from './AppIcon.vue';

/**
 * Aclara de cuántos expedientes provienen los datos de una vista global. Si el
 * servidor alcanza su límite seguro, se indica explícitamente para no presentar
 * resultados parciales como si fueran el total.
 */
defineProps<{ result: ScopedResult<unknown>; noun?: string }>();
</script>

<template>
  <p class="mb-4 flex items-start gap-2 text-xs leading-relaxed text-slate-500">
    <AppIcon name="info" :size="14" class="mt-0.5 shrink-0" />
    <span v-if="result.truncated">
      {{ noun ?? 'Datos' }} de los {{ result.scanned }} expedientes considerados. Hay más registros disponibles; ajuste los filtros o abra el expediente correspondiente.
    </span>
    <span v-else>{{ noun ?? 'Datos' }} de {{ result.scanned }} {{ result.scanned === 1 ? 'expediente' : 'expedientes' }}.</span>
  </p>
</template>
