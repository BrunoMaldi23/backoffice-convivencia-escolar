<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router';
import AppIcon from './AppIcon.vue';

defineProps<{ title: string; description?: string; back?: { to: RouteLocationRaw; label: string } }>();
</script>

<template>
  <header class="mb-6 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-end lg:justify-between">
    <div class="min-w-0">
      <RouterLink v-if="back" :to="back.to" class="mb-3 inline-flex items-center gap-1.5 rounded text-sm font-medium text-sky-700 hover:text-sky-900">
        <AppIcon name="arrow-left" :size="16" />{{ back.label }}
      </RouterLink>
      <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem]">{{ title }}</h1>
        <slot name="badges" />
      </div>
      <p v-if="description" class="mt-1.5 max-w-3xl text-[0.9375rem] leading-relaxed text-slate-600">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2"><slot name="actions" /></div>
  </header>
</template>
