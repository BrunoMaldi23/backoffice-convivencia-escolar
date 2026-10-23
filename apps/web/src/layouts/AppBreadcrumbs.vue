<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import AppIcon from '@/components/AppIcon.vue';

/** Migas de pan desde `meta.breadcrumb` de la ruta. El último elemento es la página actual. */
const route = useRoute();
const crumbs = computed(() => route.meta.breadcrumb ?? (route.meta.title ? [{ label: route.meta.title }] : []));
</script>

<template>
  <nav v-if="crumbs.length" aria-label="Ruta de navegación" class="min-w-0">
    <ol class="flex min-w-0 items-center gap-1.5 text-sm">
      <li v-for="(crumb, i) in crumbs" :key="i" class="flex min-w-0 items-center gap-1.5">
        <AppIcon v-if="i > 0" name="chevron-right" :size="14" class="text-slate-400" />
        <RouterLink v-if="crumb.to && i < crumbs.length - 1" :to="crumb.to" class="truncate rounded text-slate-500 hover:text-slate-900">{{ crumb.label }}</RouterLink>
        <span v-else class="truncate font-medium text-slate-900" :aria-current="i === crumbs.length - 1 ? 'page' : undefined">{{ crumb.label }}</span>
      </li>
    </ol>
  </nav>
</template>
