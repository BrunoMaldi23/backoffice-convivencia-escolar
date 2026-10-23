<script setup lang="ts">
import { RouterView } from 'vue-router';
import { isUiPreview } from '@/config/preview';
import InstitutionLogo from '@/components/InstitutionLogo.vue';

/**
 * Pantallas de autenticación en dos columnas. La columna institucional usa el azul del escudo con curvas
 * doradas (el logo trae el nombre del colegio en blanco, por eso necesita fondo oscuro). El formulario va en una
 * tarjeta sobre un fondo azul muy suave. En tablet y móvil la columna izquierda se reduce a una franja superior.
 */
</script>

<template>
  <div class="min-h-dvh bg-white lg:grid lg:grid-cols-12">
    <aside class="relative isolate overflow-hidden bg-brand text-white lg:col-span-5">
      <div class="absolute inset-0 -z-20 bg-[linear-gradient(135deg,#0a1f63_0%,#0f3190_48%,#2a68cf_100%)]" aria-hidden="true" />
      <svg class="absolute inset-0 -z-10 hidden h-full w-full lg:block" viewBox="0 0 836 941" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true" focusable="false">
        <defs>
          <radialGradient id="auth-glow" cx="85%" cy="8%" r="55%"><stop offset="0" stop-color="#5b97ee" stop-opacity=".55" /><stop offset="1" stop-color="#5b97ee" stop-opacity="0" /></radialGradient>
          <radialGradient id="auth-glow-2" cx="5%" cy="95%" r="45%"><stop offset="0" stop-color="#3f7be0" stop-opacity=".5" /><stop offset="1" stop-color="#3f7be0" stop-opacity="0" /></radialGradient>
        </defs>
        <rect width="836" height="941" fill="url(#auth-glow)" />
        <rect width="836" height="941" fill="url(#auth-glow-2)" />
        <path d="M-10 270C30 120 150 20 310 -5" stroke="#d6a21c" stroke-opacity=".75" stroke-width="2" />
        <path d="M-10 600C90 740 330 790 600 960" stroke="#d6a21c" stroke-opacity=".7" stroke-width="2" />
        <path d="M836 560C720 640 700 800 560 960" stroke="#7fb0f5" stroke-opacity=".18" stroke-width="1.5" />
      </svg>

      <div class="mx-auto flex max-w-xl items-center gap-5 px-6 py-5 sm:px-10 lg:min-h-dvh lg:max-w-none lg:flex-col lg:items-start lg:justify-center lg:gap-0 lg:px-14 lg:py-10 xl:px-20">
        <div class="shrink-0 lg:hidden"><InstitutionLogo :size="60" /></div>
        <div class="hidden shrink-0 lg:block"><InstitutionLogo :size="112" /></div>
        <span class="mt-8 hidden h-[3px] w-14 rounded-full bg-gold lg:block" aria-hidden="true" />
        <div class="min-w-0 lg:mt-8">
          <p class="text-base font-semibold leading-snug lg:max-w-md lg:text-[2.25rem] lg:font-bold lg:leading-[1.12] lg:tracking-tight">Panel de Convivencia Escolar</p>
          <p class="mt-0.5 text-sm text-sky-100 lg:mt-3 lg:text-lg lg:text-sky-100/90">Sistema interno de gestión institucional</p>
        </div>
      </div>
    </aside>

    <main class="relative isolate flex items-start justify-center overflow-hidden bg-[linear-gradient(160deg,#ffffff_0%,#f3f7fe_60%,#e9f1fd_100%)] px-4 py-8 sm:px-10 sm:py-12 lg:col-span-7 lg:min-h-dvh lg:items-center lg:py-8">
      <svg class="absolute inset-0 -z-10 h-full w-full" viewBox="0 0 1000 940" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true" focusable="false">
        <path d="M1000 40C900 90 820 190 760 330 700 470 820 560 1000 640Z" fill="#dbe8fb" fill-opacity=".55" />
        <path d="M0 780C120 740 240 800 330 940H0Z" fill="#dbe8fb" fill-opacity=".45" />
        <path d="M1000 700C930 780 880 860 860 940H1000Z" fill="#cfe0f9" fill-opacity=".5" />
      </svg>
      <div class="w-full max-w-[26rem] rounded-3xl bg-white p-6 shadow-[0_24px_64px_-20px_rgba(16,37,107,0.28)] ring-1 ring-slate-900/5 sm:p-8"><RouterView /></div>
      <p v-if="isUiPreview" class="absolute bottom-3 left-1/2 w-max max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-full border border-dashed border-amber-400 bg-amber-50 px-3.5 py-1.5 text-center text-xs text-amber-900">
        <strong class="font-semibold">Previsualización.</strong> API simulada, sin inicio de sesión real. Recargue la página para volver a la sesión sintética.
      </p>
    </main>
  </div>
</template>
