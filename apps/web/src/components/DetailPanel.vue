<script setup lang="ts">
/** Lista de pares etiqueta/valor. Los valores complejos usan el slot `item-<key>`. */
import type { DetailItem } from './types';
withDefaults(defineProps<{ items: DetailItem[]; columns?: 1 | 2 | 3 }>(), { columns: 2 });
</script>

<template>
  <dl :class="['grid gap-x-6 gap-y-5', columns === 3 ? 'sm:grid-cols-2 xl:grid-cols-3' : columns === 2 ? 'sm:grid-cols-2' : '']">
    <div v-for="item in items" :key="item.key" :class="item.wide ? 'sm:col-span-full' : ''">
      <dt class="text-[0.8125rem] font-medium text-slate-500">{{ item.label }}</dt>
      <dd class="mt-1 text-sm text-slate-900">
        <slot :name="`item-${item.key}`">{{ item.value ?? '—' }}</slot>
      </dd>
    </div>
  </dl>
</template>
