<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue';
import { useSidebar } from '@/composables/useSidebar';
import AppBreadcrumbs from './AppBreadcrumbs.vue';
import NotificationsButton from './NotificationsButton.vue';
import UserMenu from './UserMenu.vue';

const { collapsed, toggleCollapsed, openMobile } = useSidebar();
</script>

<template>
  <header class="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-slate-200 bg-white/95 px-3 backdrop-blur sm:px-5">
    <button type="button" class="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden" aria-label="Abrir navegación" @click="openMobile">
      <AppIcon name="menu" :size="20" />
    </button>
    <button
      type="button" class="hidden h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 md:flex"
      :aria-label="collapsed ? 'Expandir navegación lateral' : 'Contraer navegación lateral'" :aria-expanded="!collapsed" @click="toggleCollapsed"
    >
      <AppIcon name="panel-left" :size="19" />
    </button>
    <span class="text-sm font-semibold text-slate-900 md:hidden">Convivencia</span>
    <div class="hidden min-w-0 flex-1 md:block"><AppBreadcrumbs /></div>
    <div class="ml-auto flex items-center gap-1">
      <NotificationsButton />
      <UserMenu />
    </div>
  </header>
</template>
