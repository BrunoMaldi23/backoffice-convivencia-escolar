<script setup lang="ts">
import AppIcon from './AppIcon.vue';

withDefaults(defineProps<{ title: string; description?: string; icon?: string; compact?: boolean }>(), { description: undefined, icon: 'folder', compact: false });
</script>

<template>
  <div :class="['flex flex-col items-center text-center', compact ? 'px-4 py-8' : 'px-6 py-14']">
    <span class="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500"><AppIcon :name="icon" :size="20" /></span>
    <p class="mt-4 font-semibold text-slate-900">{{ title }}</p>
    <p v-if="description" class="mt-1 max-w-md text-sm leading-relaxed text-slate-600">{{ description }}</p>
    <div v-if="$slots.default" class="mt-5 flex flex-wrap justify-center gap-2"><slot /></div>
  </div>
</template>
