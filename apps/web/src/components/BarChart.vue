<script setup lang="ts">
import { computed, ref } from 'vue';
import { formatNumber } from '@/lib/format';

/**
 * Gráfico de barras de una sola serie, sin dependencias. Un solo tono (sky-600), sin leyenda (el título nombra la serie),
 * valores al pasar el cursor o con foco de teclado, y vista de tabla alternativa para accesibilidad.
 */
const props = withDefaults(defineProps<{ data: { label: string; value: number }[]; title: string; unit?: string; horizontal?: boolean; heightClass?: string }>(), { unit: 'casos', horizontal: false, heightClass: 'h-48' });
const showTable = ref(false);
const max = computed(() => Math.max(1, ...props.data.map((d) => d.value)));
const pct = (v: number) => `${Math.max(2, (v / max.value) * 100)}%`;
</script>

<template>
  <figure class="m-0">
    <div class="mb-3 flex items-center justify-between gap-3">
      <figcaption class="text-sm font-medium text-slate-700">{{ title }}</figcaption>
      <button type="button" class="rounded text-xs font-medium text-sky-700 hover:text-sky-900" :aria-pressed="showTable" @click="showTable = !showTable">
        {{ showTable ? 'Ver gráfico' : 'Ver tabla' }}
      </button>
    </div>

    <table v-if="showTable" class="w-full text-sm">
      <thead><tr class="border-b border-slate-200 text-left text-slate-500"><th class="py-2 font-medium">Categoría</th><th class="py-2 text-right font-medium">Valor</th></tr></thead>
      <tbody><tr v-for="d in data" :key="d.label" class="border-b border-slate-100"><td class="py-2 text-slate-700">{{ d.label }}</td><td class="py-2 text-right tabular-nums text-slate-900">{{ formatNumber(d.value) }}</td></tr></tbody>
    </table>

    <ul v-else-if="horizontal" class="space-y-3" role="list">
      <li v-for="d in data" :key="d.label" class="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm">
        <span class="truncate text-slate-700" :title="d.label">{{ d.label }}</span>
        <span class="h-2.5 rounded-r bg-slate-100"><span class="block h-full rounded-r bg-sky-600" :style="{ width: pct(d.value) }" /></span>
        <span class="w-8 text-right tabular-nums text-slate-900">{{ formatNumber(d.value) }}</span>
      </li>
    </ul>

    <div v-else :class="['flex items-end gap-2 border-b border-slate-300 sm:gap-4', heightClass]" role="list">
      <div
        v-for="d in data" :key="d.label" role="listitem" tabindex="0" :aria-label="`${d.label}: ${d.value} ${unit}`"
        class="group relative flex h-full flex-1 flex-col justify-end rounded-sm outline-offset-4"
      >
        <span class="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100">
          {{ formatNumber(d.value) }} {{ unit }}
        </span>
        <span class="mx-auto w-full max-w-10 rounded-t bg-sky-600 group-hover:bg-sky-700" :style="{ height: pct(d.value) }" />
      </div>
    </div>
    <div v-if="!showTable && !horizontal" class="mt-2 flex gap-2 sm:gap-4" aria-hidden="true">
      <span v-for="d in data" :key="d.label" class="flex-1 text-center text-xs text-slate-500">{{ d.label }}</span>
    </div>
  </figure>
</template>
