<script setup lang="ts">
import Skeleton from 'primevue/skeleton';

withDefaults(defineProps<{ rows?: number; label?: string }>(), { rows: 5, label: 'Cargando información' });
</script>

<template>
  <div class="space-y-3 p-5" role="status" :aria-label="label" aria-live="polite">
    <Skeleton height="1rem" width="40%" />
    <Skeleton v-for="n in rows" :key="n" height="2.25rem" />
    <span class="sr-only">{{ label }}…</span>
  </div>
</template>
