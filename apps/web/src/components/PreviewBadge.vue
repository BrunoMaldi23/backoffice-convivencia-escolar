<script setup lang="ts">
import { isUiPreview } from '@/config/preview';
import AppIcon from './AppIcon.vue';
</script>

<template>
  <span
    v-if="isUiPreview"
    class="inline-flex items-center gap-1 rounded-md border border-dashed border-amber-400 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900"
    title="Datos sintéticos de previsualización: no son registros reales"
  ><AppIcon name="info" :size="13" />Datos de demostración</span>
</template>
