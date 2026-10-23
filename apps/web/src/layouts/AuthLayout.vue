<script setup lang="ts">
import { RouterView } from 'vue-router';
import { isUiPreview } from '@/config/preview';
import AppIcon from '@/components/AppIcon.vue';
import InstitutionLogo from '@/components/InstitutionLogo.vue';

/**
 * Pantallas de autenticación en dos columnas. La columna institucional es un azul sobrio (el logo trae el nombre del colegio en
 * blanco, por eso necesita fondo oscuro) con el escudo como marca de agua, un mensaje breve y tres garantías del sistema. El
 * formulario va en una tarjeta sobre un fondo azul muy suave. En tablet y móvil la columna izquierda se reduce a una franja superior.
 */
const HIGHLIGHTS = [
  { icon: 'lock', title: 'Casos confidenciales', text: 'Cada persona ve solo los expedientes que le corresponden.' },
  { icon: 'history', title: 'Todo queda registrado', text: 'Cambios, entrevistas y decisiones, con fecha y responsable.' },
  { icon: 'folder', title: 'Un solo lugar de trabajo', text: 'Denuncias, medidas, citaciones y seguimientos en el mismo expediente.' }
] as const;
</script>

<template>
  <div class="min-h-dvh bg-white lg:grid lg:grid-cols-12">
    <aside class="relative isolate overflow-hidden bg-brand text-white lg:col-span-5">
      <div class="absolute inset-0 -z-20 bg-[linear-gradient(180deg,#0b1c57_0%,#0d2368_100%)]" aria-hidden="true" />
      <!-- Escudo del colegio como marca de agua: ancla la identidad sin competir con el texto -->
      <div class="pointer-events-none absolute -bottom-24 -right-28 -z-10 hidden opacity-[0.07] lg:block" aria-hidden="true"><InstitutionLogo variant="emblem" :size="560" /></div>
      <span class="absolute inset-y-0 left-0 -z-10 hidden w-1 bg-gold lg:block" aria-hidden="true" />

      <!-- Tablet y móvil: franja superior compacta -->
      <div class="mx-auto flex max-w-xl items-center gap-5 px-6 py-5 sm:px-10 lg:hidden">
        <div class="shrink-0"><InstitutionLogo :size="60" /></div>
        <div class="min-w-0">
          <p class="text-base font-semibold leading-snug">Panel de Convivencia Escolar</p>
          <p class="mt-0.5 text-sm text-sky-100">Sistema interno de gestión institucional</p>
        </div>
      </div>

      <div class="hidden min-h-dvh flex-col justify-between gap-8 px-14 py-10 lg:flex xl:px-20 xl:py-14">
        <InstitutionLogo :size="84" />

        <div>
          <p class="max-w-md text-[2.5rem] font-bold leading-[1.1] tracking-tight xl:text-[2.75rem]">Convivencia escolar, con registro y resguardo.</p>
          <p class="mt-5 max-w-sm text-[1.0625rem] leading-relaxed text-sky-100/85">Panel interno para llevar los casos del colegio de principio a fin.</p>
        </div>

        <div>
          <ul class="hidden max-w-sm space-y-5 [@media(min-height:800px)]:block">
            <li v-for="item in HIGHLIGHTS" :key="item.title" class="flex items-start gap-4">
              <span class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-gold ring-1 ring-white/15"><AppIcon :name="item.icon" :size="18" /></span>
              <div>
                <p class="text-[0.9375rem] font-semibold">{{ item.title }}</p>
                <p class="mt-0.5 text-sm leading-relaxed text-sky-100/80">{{ item.text }}</p>
              </div>
            </li>
          </ul>
          <p class="border-t border-white/15 pt-5 text-xs text-sky-100/70 [@media(min-height:800px)]:mt-10">Colegio Bautista · Uso exclusivo del personal autorizado</p>
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
