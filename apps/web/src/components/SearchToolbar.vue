<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import AppIcon from './AppIcon.vue';
import type { FilterDef } from './types';

/** Buscador y filtros en una sola fila sobre la tabla. Los filtros vacíos significan "todos". */
const props = withDefaults(defineProps<{ filters?: FilterDef[]; placeholder?: string; total?: number | null; searchable?: boolean }>(), { filters: () => [], placeholder: 'Buscar', total: null, searchable: true });
const search = defineModel<string>('search', { default: '' });
const values = defineModel<Record<string, string | null>>('values', { default: () => ({}) });
const active = computed(() => Boolean(search.value) || Object.values(values.value).some(Boolean));

function setFilter(field: string, value: string | null) {
  values.value = { ...values.value, [field]: value };
}
function clear() {
  search.value = '';
  values.value = Object.fromEntries(props.filters.map((f) => [f.field, null]));
}
</script>

<template>
  <div class="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center">
    <IconField v-if="searchable" class="w-full xl:w-80 xl:shrink-0">
      <InputIcon><AppIcon name="search" :size="16" class="text-slate-500" /></InputIcon>
      <InputText v-model="search" :placeholder="placeholder" :aria-label="placeholder" class="w-full" type="search" />
    </IconField>
    <div v-if="filters.length" class="grid grid-cols-2 gap-2 xl:flex xl:min-w-0 xl:flex-1 xl:flex-nowrap">
      <Select
        v-for="filter in filters" :key="filter.field" :model-value="values[filter.field] ?? null" :options="filter.options"
        option-label="label" option-value="value" :placeholder="filter.label" :aria-label="`Filtrar por ${filter.label.toLowerCase()}`" show-clear class="w-full min-w-0 last:odd:col-span-2 xl:min-w-36 xl:flex-1"
        @update:model-value="(v: string | null) => setFilter(filter.field, v)"
      />
    </div>
    <div class="flex shrink-0 items-center gap-3 xl:ml-auto">
      <Button v-if="active" label="Limpiar filtros" text size="small" @click="clear" />
      <p v-if="total !== null" class="whitespace-nowrap text-sm tabular-nums text-slate-500" aria-live="polite">{{ total }} {{ total === 1 ? 'resultado' : 'resultados' }}</p>
    </div>
  </div>
</template>
