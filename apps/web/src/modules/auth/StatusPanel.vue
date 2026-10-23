<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router';
import Button from 'primevue/button';
import AppIcon from '@/components/AppIcon.vue';
import AuthTitle from './AuthTitle.vue';

/** Panel común para sesión expirada, acceso denegado y página no encontrada. */
defineProps<{ icon: string; code?: string; title: string; description: string; action: { to: RouteLocationRaw; label: string }; tone?: 'warning' | 'neutral' }>();
</script>

<template>
  <div>
    <span :class="['flex h-12 w-12 items-center justify-center rounded-full', tone === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600']">
      <AppIcon :name="icon" :size="22" />
    </span>
    <p v-if="code" class="mt-6 text-sm font-semibold tabular-nums text-slate-500">Error {{ code }}</p>
    <AuthTitle :class="code ? 'mt-1' : 'mt-6'">{{ title }}</AuthTitle>
    <p class="mt-4 text-sm leading-relaxed text-slate-600">{{ description }}</p>
    <RouterLink :to="action.to" custom>
      <template #default="{ navigate, href }"><Button as="a" :href="href" :label="action.label" class="mt-8 !border-action !bg-action hover:!bg-action-dark" @click="navigate" /></template>
    </RouterLink>
    <slot />
  </div>
</template>
