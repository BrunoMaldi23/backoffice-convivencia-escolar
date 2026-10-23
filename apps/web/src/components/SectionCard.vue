<script setup lang="ts">
/**
 * Superficie con título opcional. El encabezado lleva un tinte azul claro y un filo superior de color de acción para que el
 * contenido no se vea como una hoja blanca plana; el cuerpo es gris azulado muy suave, de modo que las tarjetas blancas que
 * contiene (registros del expediente) destaquen. `flush` elimina el relleno interno y el tinte (tablas y listas a sangre).
 */
withDefaults(defineProps<{ title?: string; description?: string; flush?: boolean; dense?: boolean; as?: string }>(), { title: undefined, description: undefined, flush: false, dense: false, as: 'section' });
</script>

<template>
  <component :is="as" class="min-w-0 overflow-hidden rounded-xl border border-t-[3px] border-slate-200 border-t-sky-700 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
    <header v-if="title || $slots.actions" class="flex flex-wrap items-start justify-between gap-3 border-b border-sky-100 bg-sky-50/70" :class="dense ? 'px-4 py-2.5' : 'px-5 py-4'">
      <div class="min-w-0">
        <h2 v-if="title" :class="['font-semibold text-slate-900', dense ? 'text-sm' : 'text-[0.9375rem]']">{{ title }}</h2>
        <p v-if="description" :class="['mt-0.5 text-slate-600', dense ? 'text-xs' : 'text-sm']">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="flex items-center gap-2"><slot name="actions" /></div>
    </header>
    <div :class="flush ? '' : dense ? 'bg-slate-50/80 p-4' : 'bg-slate-50/80 p-5'"><slot /></div>
  </component>
</template>
