<script setup lang="ts">
import { RouterView } from 'vue-router';
import { isUiPreview } from '@/config/preview';
import AppIcon from '@/components/AppIcon.vue';
import InstitutionLogo from '@/components/InstitutionLogo.vue';

/**
 * Pantallas de autenticación en dos columnas. La columna institucional es un azul luminoso (el logo trae el nombre del colegio en
 * blanco, por eso necesita un fondo saturado) con luces suaves y una tarjeta de vidrio que muestra cómo avanza un caso: es la única
 * pieza destacada, el resto es texto sobrio. El formulario va en una tarjeta sobre un fondo azul muy suave. En tablet y móvil la
 * columna izquierda se reduce a una franja superior.
 */
const STEPS = [
  { title: 'Recepción', text: 'Se registra la denuncia y se abre el expediente.', state: 'done' },
  { title: 'Evaluación', text: 'Se revisan los antecedentes y se resguarda a las personas.', state: 'done' },
  { title: 'Seguimiento', text: 'Entrevistas, citaciones, derivaciones y acuerdos.', state: 'current' },
  { title: 'Cierre', text: 'Queda el registro completo, con fecha y responsable.', state: 'next' }
] as const;
</script>

<template>
  <div class="min-h-dvh bg-white lg:grid lg:grid-cols-12">
    <aside class="relative isolate overflow-hidden bg-brand text-white lg:col-span-5">
      <div class="absolute inset-0 -z-20 bg-[linear-gradient(155deg,#153d9f_0%,#2459cf_52%,#3a76e2_100%)]" aria-hidden="true" />
      <!-- Luces suaves: dan profundidad sin dibujos ni curvas -->
      <div class="absolute -right-24 -top-28 -z-10 hidden h-[26rem] w-[26rem] rounded-full bg-sky-200/30 blur-3xl lg:block" aria-hidden="true" />
      <div class="absolute -bottom-32 -left-24 -z-10 hidden h-[24rem] w-[24rem] rounded-full bg-gold/25 blur-3xl lg:block" aria-hidden="true" />
      <div class="absolute inset-x-0 top-0 -z-10 hidden h-px bg-white/30 lg:block" aria-hidden="true" />

      <!-- Tablet y móvil: franja superior compacta -->
      <div class="mx-auto flex max-w-xl items-center gap-5 px-6 py-5 sm:px-10 lg:hidden">
        <div class="shrink-0"><InstitutionLogo :size="60" /></div>
        <div class="min-w-0">
          <p class="text-base font-semibold leading-snug">Panel de Convivencia Escolar</p>
          <p class="mt-0.5 text-sm text-sky-100">Sistema interno de gestión institucional</p>
        </div>
      </div>

      <div class="hidden min-h-dvh flex-col justify-between gap-8 px-14 py-10 lg:flex xl:px-20">
        <InstitutionLogo :size="84" />

        <div>
          <p class="max-w-md text-[2.5rem] font-semibold leading-[1.08] tracking-[-0.02em] xl:text-[2.875rem]">Convivencia escolar, con registro y resguardo.</p>
          <p class="mt-5 max-w-sm text-[1.0625rem] leading-relaxed text-white/90">Panel interno para llevar los casos del colegio de principio a fin.</p>
        </div>

        <!-- Tarjeta de vidrio: solo se muestra si la pantalla es lo bastante alta para que el ingreso no necesite scroll -->
        <section class="hidden max-w-md rounded-[1.75rem] bg-white/[0.14] p-5 ring-1 ring-inset ring-white/30 shadow-[0_30px_70px_-30px_rgba(6,24,92,0.65)] backdrop-blur-xl [@media(min-height:930px)]:block [@media(min-height:790px)_and_(min-width:1700px)]:block" aria-label="Cómo avanza un caso">
          <h2 class="text-sm font-semibold text-white">Así avanza un caso</h2>
          <ol class="mt-4">
            <li v-for="(step, index) in STEPS" :key="step.title" class="relative flex gap-4 pb-4 last:pb-0">
              <span v-if="index < STEPS.length - 1" class="absolute left-[0.8125rem] top-8 h-[calc(100%-1.5rem)] w-px" :class="step.state === 'done' ? 'bg-white/60' : 'bg-white/25'" aria-hidden="true" />
              <span
                class="relative flex h-[1.625rem] w-[1.625rem] shrink-0 items-center justify-center rounded-full"
                :class="step.state === 'done' ? 'bg-white text-[#153d9f]' : step.state === 'current' ? 'bg-gold text-[#153d9f] ring-4 ring-gold/30' : 'bg-white/10 text-white/70 ring-1 ring-inset ring-white/40'"
                aria-hidden="true"
              >
                <svg v-if="step.state === 'done'" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                <span v-else class="text-xs font-semibold">{{ index + 1 }}</span>
              </span>
              <div class="min-w-0 pt-0.5">
                <p class="text-[0.9375rem] font-semibold leading-snug">{{ step.title }}<span class="sr-only">{{ step.state === 'done' ? ' (completado)' : step.state === 'current' ? ' (en curso)' : ' (pendiente)' }}</span></p>
                <p class="mt-0.5 text-sm leading-snug text-white/85">{{ step.text }}</p>
              </div>
            </li>
          </ol>
        </section>

        <p class="flex items-center gap-2 text-xs text-white/85">
          <AppIcon name="lock" :size="14" />Colegio Bautista · Uso exclusivo del personal autorizado
        </p>
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
