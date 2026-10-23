<script setup lang="ts">
import { RouterView } from 'vue-router';
import { isUiPreview } from '@/config/preview';
import AppIcon from '@/components/AppIcon.vue';
import InstitutionLogo from '@/components/InstitutionLogo.vue';
import facade from '@/assets/colegio-fachada.webp';

/**
 * Pantallas de autenticación en dos columnas. La columna institucional toma los colores del logo (azul real, dorado y blanco):
 * degradado azul con curvas finas y la fachada del colegio difuminada al pie, logo, titular, tres ideas con ícono y una nota institucional en vidrio. Las tres ideas solo
 * se muestran si la pantalla es lo bastante grande para que el ingreso siga sin scroll. El formulario va en una tarjeta sobre un
 * fondo azul muy suave. En tablet y móvil la columna izquierda se reduce a una franja superior.
 */
const FEATURES = [
  { icon: 'file', title: 'Registro ordenado', text: 'Centraliza las denuncias y abre expedientes.' },
  { icon: 'users', title: 'Seguimiento responsable', text: 'Revisa antecedentes y gestiona acciones.' },
  { icon: 'shield', title: 'Entorno seguro', text: 'Información protegida y acceso institucional.' }
] as const;
</script>

<template>
  <div class="min-h-dvh bg-white lg:grid lg:grid-cols-12">
    <aside class="relative isolate overflow-hidden bg-brand text-white lg:col-span-5">
      <div class="absolute inset-0 -z-20 bg-[linear-gradient(150deg,#0a2c8c_0%,#1550c9_48%,#2f7bf2_100%)]" aria-hidden="true" />
      <div class="absolute -right-20 -top-24 -z-10 hidden h-[24rem] w-[24rem] rounded-full bg-sky-300/25 blur-3xl lg:block" aria-hidden="true" />
      <!-- Fachada del colegio: se funde con el azul hacia arriba y queda detrás de la nota inferior -->
      <img :src="facade" alt="" class="absolute inset-x-0 bottom-0 -z-10 hidden h-[36%] w-full object-cover object-[55%_66%] opacity-60 mix-blend-luminosity [mask-image:linear-gradient(to_top,black_0%,black_40%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_top,black_0%,black_40%,transparent_100%)] lg:block" width="1000" height="667" decoding="async">
      <div class="absolute inset-x-0 bottom-0 -z-10 hidden h-[36%] bg-[linear-gradient(to_top,rgba(10,44,140,0.7),transparent_85%)] lg:block" aria-hidden="true" />
      <svg class="absolute inset-0 -z-10 hidden h-full w-full lg:block" viewBox="0 0 800 940" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true" focusable="false">
        <path d="M800 120C690 150 600 250 560 380" stroke="#ffffff" stroke-opacity=".14" stroke-width="1.5" />
        <path d="M-10 560C80 620 120 760 90 960" stroke="#ffffff" stroke-opacity=".1" stroke-width="1.5" />
        <path d="M800 640C700 700 640 800 600 960" stroke="#ffffff" stroke-opacity=".12" stroke-width="1.5" />
      </svg>

      <!-- Tablet y móvil: franja superior compacta -->
      <div class="mx-auto flex max-w-xl items-center gap-5 px-6 py-5 sm:px-10 lg:hidden">
        <div class="shrink-0"><InstitutionLogo :size="60" /></div>
        <div class="min-w-0">
          <p class="text-base font-semibold leading-snug">Panel de Convivencia Escolar</p>
          <p class="mt-0.5 text-sm text-sky-100">Sistema interno de gestión institucional</p>
        </div>
      </div>

      <div class="hidden min-h-dvh flex-col justify-between gap-7 px-14 py-10 lg:flex xl:px-20">
        <div>
          <InstitutionLogo :size="84" />
          <span class="mt-7 block h-[3px] w-14 rounded-full bg-gold" aria-hidden="true" />
          <p class="mt-6 text-[2.5rem] font-bold leading-[1.1] tracking-tight xl:text-[2.875rem]">Convivencia escolar,<br><span class="text-gold">clara y segura.</span></p>
          <p class="mt-5 max-w-md text-[1.0625rem] leading-relaxed text-white/90">Un espacio institucional para registrar, hacer seguimiento y resguardar los casos de convivencia escolar.</p>

          <ul class="mt-8 hidden max-w-md space-y-5 [@media(min-height:930px)]:block [@media(min-height:790px)_and_(min-width:1700px)]:block">
            <li v-for="item in FEATURES" :key="item.title" class="flex items-center gap-4">
              <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.14] ring-1 ring-inset ring-white/30"><AppIcon :name="item.icon" :size="20" /></span>
              <div>
                <p class="text-base font-semibold leading-snug">{{ item.title }}</p>
                <p class="text-sm leading-snug text-white/85">{{ item.text }}</p>
              </div>
            </li>
          </ul>
        </div>

        <div class="flex max-w-md items-center gap-4 rounded-2xl bg-white/[0.12] px-5 py-4 ring-1 ring-inset ring-white/25 backdrop-blur-md">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.14] ring-1 ring-inset ring-white/30"><AppIcon name="student" :size="20" /></span>
          <span class="h-9 w-px shrink-0 bg-white/30" aria-hidden="true" />
          <p class="text-sm font-medium leading-snug">Por una comunidad educativa más respetuosa y segura.<span class="mt-0.5 block text-xs font-normal text-white/80">Colegio Bautista · Uso exclusivo del personal autorizado</span></p>
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
