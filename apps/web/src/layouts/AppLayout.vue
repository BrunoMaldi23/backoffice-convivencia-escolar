<script setup lang="ts">
import { watch } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import Drawer from 'primevue/drawer';
import AppIcon from '@/components/AppIcon.vue';
import { isUiPreview } from '@/config/preview';
import { useSidebar } from '@/composables/useSidebar';
import AppHeader from './AppHeader.vue';
import AppSidebar from './AppSidebar.vue';

/**
 * Layout administrativo. Escritorio (≥1280 px): sidebar completa. Tablet (768–1279 px): sidebar plegable,
 * contraída por defecto a íconos. Móvil (<768 px): Drawer.
 */
const { collapsed, mobileOpen, closeMobile } = useSidebar();
const route = useRoute();
watch(() => route.fullPath, closeMobile);

if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1279px)').matches) collapsed.value = true;
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <a href="#contenido" class="sr-only z-50 rounded-md bg-white px-4 py-2 text-sm font-medium text-sky-800 focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Saltar al contenido</a>

    <aside :class="['fixed inset-y-0 left-0 z-30 hidden border-r border-slate-200 bg-white md:block', collapsed ? 'w-16' : 'w-64']">
      <AppSidebar :rail="collapsed" />
    </aside>

    <Drawer v-model:visible="mobileOpen" :show-close-icon="false" class="!w-72" :pt="{ content: { class: 'p-0' }, header: { class: 'hidden' } }" aria-label="Navegación">
      <div class="relative h-full">
        <button type="button" class="absolute right-3 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100" aria-label="Cerrar navegación" @click="closeMobile">
          <AppIcon name="x" :size="18" />
        </button>
        <AppSidebar @navigate="closeMobile" />
      </div>
    </Drawer>

    <div :class="['flex min-h-screen flex-col', collapsed ? 'md:pl-16' : 'md:pl-64']">
      <AppHeader />
      <div v-if="isUiPreview" class="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 sm:px-6" role="note">
        <strong class="font-semibold">Modo previsualización.</strong> API simulada con datos sintéticos y sesión sintética: nada se guarda ni se envía al servidor. Este modo no existe en la compilación de producción.
      </div>
      <main id="contenido" tabindex="-1" class="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <RouterView />
      </main>
    </div>
  </div>
</template>
