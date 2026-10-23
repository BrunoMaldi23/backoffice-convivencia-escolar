<script setup lang="ts">
import { computed } from 'vue';
import { priorityOf } from '@/lib/status';

/** Prioridad con barras de nivel (forma) además del color, para no depender solo del tono. Acepta cualquier código de la API. */
const props = defineProps<{ priority: string }>();
const def = computed(() => priorityOf(props.priority));
const barColor = computed(() => ({ neutral: 'bg-slate-500', info: 'bg-sky-600', warning: 'bg-amber-600', danger: 'bg-red-600', success: 'bg-emerald-600', progress: 'bg-indigo-600' })[def.value.tone]);
</script>

<template>
  <span class="inline-flex items-center gap-2 whitespace-nowrap text-sm text-slate-700">
    <span class="flex items-end gap-0.5" aria-hidden="true">
      <span v-for="n in 4" :key="n" :class="['w-1 rounded-sm', n <= def.rank ? barColor : 'bg-slate-200']" :style="{ height: `${4 + n * 2}px` }" />
    </span>
    <span :class="def.rank === 4 ? 'font-semibold text-red-800' : ''">{{ def.label }}</span>
  </span>
</template>
