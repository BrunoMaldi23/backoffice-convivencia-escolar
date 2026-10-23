<script setup lang="ts">
/** Superficie blanca con título opcional. `flush` elimina el relleno interno (tablas y listas a sangre). */
withDefaults(defineProps<{ title?: string; description?: string; flush?: boolean; dense?: boolean; as?: string }>(), { title: undefined, description: undefined, flush: false, dense: false, as: 'section' });
</script>

<template>
  <component :is="as" class="min-w-0 rounded-xl border border-slate-200 bg-white">
    <header v-if="title || $slots.actions" class="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100" :class="dense ? 'px-4 py-2.5' : 'px-5 py-4'">
      <div class="min-w-0">
        <h2 v-if="title" :class="['font-semibold text-slate-900', dense ? 'text-sm' : 'text-[0.9375rem]']">{{ title }}</h2>
        <p v-if="description" :class="['mt-0.5 text-slate-600', dense ? 'text-xs' : 'text-sm']">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="flex items-center gap-2"><slot name="actions" /></div>
    </header>
    <div :class="flush ? '' : dense ? 'p-4' : 'p-5'"><slot /></div>
  </component>
</template>
