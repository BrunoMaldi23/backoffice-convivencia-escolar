<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router';
import { formatNumber } from '@/lib/format';
import AppIcon from './AppIcon.vue';

/** Indicador numérico. `value` nulo indica que el dato no está disponible (nunca se rellena con un número ficticio). */
withDefaults(defineProps<{ label: string; value: number | null; hint?: string; icon: string; to?: RouteLocationRaw; emphasis?: 'danger' | 'warning' }>(), { hint: undefined, to: undefined, emphasis: undefined });
</script>

<template>
  <component :is="to ? RouterLink : 'div'" :to="to" class="group block min-w-0 rounded-lg border border-slate-200 bg-white px-3.5 py-3 transition-colors hover:border-slate-300">
    <div class="flex items-center justify-between gap-2 text-slate-600">
      <span class="text-[0.8125rem] font-medium">{{ label }}</span>
      <AppIcon :name="icon" :size="16" :class="emphasis === 'danger' ? 'text-red-700' : emphasis === 'warning' ? 'text-amber-700' : 'text-slate-400'" />
    </div>
    <p v-if="value !== null" class="mt-1 text-2xl font-semibold leading-none tracking-tight tabular-nums text-slate-900">{{ formatNumber(value) }}</p>
    <p v-else class="mt-1 text-2xl font-semibold leading-none text-slate-300" aria-label="Sin datos">—</p>
    <p v-if="hint" class="mt-1 text-xs text-slate-500">{{ hint }}</p>
  </component>
</template>
