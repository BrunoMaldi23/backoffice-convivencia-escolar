<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import ToggleSwitch from 'primevue/toggleswitch';
import AppIcon from '@/components/AppIcon.vue';
import DetailPanel from '@/components/DetailPanel.vue';
import EmptyState from '@/components/EmptyState.vue';
import FormField from '@/components/FormField.vue';
import PageHeader from '@/components/PageHeader.vue';
import SectionCard from '@/components/SectionCard.vue';
import { useSession } from '@/composables/useSession';
import { roleLabel } from '@/lib/roles';

/** Configuración. Sin API de configuración, los controles se muestran deshabilitados: no hay persistencia local. */
const SECTIONS = [
  { key: 'institucion', label: 'Información institucional', icon: 'building' },
  { key: 'perfil', label: 'Perfil de usuario', icon: 'user' },
  { key: 'anio', label: 'Año escolar', icon: 'calendar' },
  { key: 'preferencias', label: 'Preferencias generales', icon: 'settings' },
  { key: 'seguridad', label: 'Seguridad de la cuenta', icon: 'lock' },
  { key: 'notificaciones', label: 'Notificaciones', icon: 'bell' },
  { key: 'parametros', label: 'Parámetros del sistema', icon: 'list' }
] as const;
type Key = (typeof SECTIONS)[number]['key'];

const route = useRoute();
const router = useRouter();
const { user } = useSession();
const active = computed<Key>({
  get: () => (SECTIONS.some((s) => s.key === route.query.seccion) ? (route.query.seccion as Key) : 'institucion'),
  set: (v) => router.replace({ query: { seccion: v } })
});
const current = computed(() => SECTIONS.find((s) => s.key === active.value)!);
</script>

<template>
  <div>
    <PageHeader title="Configuración" description="Datos institucionales, preferencias y seguridad de su cuenta." />

    <div class="grid gap-6 lg:grid-cols-[15rem_1fr]">
      <nav aria-label="Secciones de configuración" class="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        <ul class="flex gap-1 lg:flex-col">
          <li v-for="s in SECTIONS" :key="s.key">
            <button
              type="button" :aria-current="active === s.key ? 'page' : undefined" :class="['flex w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm', active === s.key ? 'bg-white font-semibold text-sky-800 ring-1 ring-slate-200' : 'text-slate-600 hover:bg-white hover:text-slate-900']"
              @click="active = s.key"
            ><AppIcon :name="s.icon" :size="16" />{{ s.label }}</button>
          </li>
        </ul>
      </nav>

      <SectionCard :title="current.label">
        <p class="mb-6 flex items-start gap-2 rounded-md bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
          <AppIcon name="info" :size="14" class="mt-0.5" />Los cambios se habilitarán al conectar el servicio de configuración. No se guarda nada en este navegador.
        </p>

        <div v-if="active === 'institucion'" class="grid gap-5 md:grid-cols-2">
          <FormField id="cfg-nombre" label="Nombre del establecimiento"><template #default="{ id }"><InputText :id="id" disabled placeholder="Pendiente de configuración" class="w-full" /></template></FormField>
          <FormField id="cfg-rbd" label="RBD"><template #default="{ id }"><InputText :id="id" disabled placeholder="Pendiente" class="w-full" /></template></FormField>
          <FormField id="cfg-comuna" label="Comuna"><template #default="{ id }"><InputText :id="id" disabled class="w-full" /></template></FormField>
          <FormField id="cfg-encargado" label="Encargado/a de convivencia"><template #default="{ id }"><InputText :id="id" disabled class="w-full" /></template></FormField>
          <div class="md:col-span-2"><p class="text-sm text-slate-600">El logo institucional se administra como recurso del sistema y no se modifica desde esta pantalla.</p></div>
        </div>

        <div v-else-if="active === 'perfil'">
          <DetailPanel v-if="user" :items="[{ key: 'n', label: 'Nombre', value: user.displayName }, { key: 'e', label: 'Correo', value: user.email }, { key: 'r', label: 'Roles', value: user.roles.map(roleLabel).join(', ') }]" />
          <EmptyState v-else compact icon="user" title="Sin sesión iniciada" description="Sus datos de perfil aparecerán aquí al iniciar sesión." />
        </div>

        <div v-else-if="active === 'anio'" class="grid gap-5 md:grid-cols-2">
          <FormField id="cfg-anio" label="Año escolar vigente"><template #default="{ id }"><Select :input-id="id" :options="[2026, 2027]" disabled placeholder="2026" class="w-full" /></template></FormField>
          <FormField id="cfg-regimen" label="Régimen"><template #default="{ id }"><Select :input-id="id" :options="['Semestral', 'Trimestral']" disabled placeholder="Semestral" class="w-full" /></template></FormField>
        </div>

        <ul v-else-if="active === 'preferencias' || active === 'notificaciones'" class="divide-y divide-slate-100">
          <li v-for="opt in (active === 'preferencias'
            ? [['Mostrar casos cerrados en búsquedas', 'pref-cerrados'], ['Abrir expedientes en la pestaña Resumen', 'pref-resumen']]
            : [['Tareas próximas a vencer', 'not-tareas'], ['Nuevas denuncias asignadas', 'not-denuncias'], ['Citaciones confirmadas o con inasistencia', 'not-citas']])" :key="opt[1]" class="flex items-center justify-between gap-4 py-3.5"
          >
            <label :for="opt[1]" class="text-sm text-slate-800">{{ opt[0] }}</label>
            <ToggleSwitch :input-id="opt[1]" disabled />
          </li>
        </ul>

        <div v-else-if="active === 'seguridad'" class="space-y-5 text-sm">
          <div>
            <p class="font-medium text-slate-900">Contraseña</p>
            <p class="mt-0.5 text-slate-600">Para cambiarla, solicite un código de recuperación. Al usarlo se cerrarán todas sus sesiones.</p>
            <RouterLink :to="{ name: 'forgot-password' }" custom>
              <template #default="{ navigate, href }"><Button as="a" :href="href" label="Solicitar código de cambio" size="small" outlined class="mt-2" @click="navigate" /></template>
            </RouterLink>
          </div>
          <div class="border-t border-slate-100 pt-5">
            <p class="font-medium text-slate-900">Sesión</p>
            <p class="mt-0.5 text-slate-600">La sesión dura hasta 12 horas y se cierra si un administrador revoca su acceso.</p>
          </div>
        </div>

        <div v-else class="space-y-3 text-sm text-slate-700">
          <p>Parámetros de plazos, categorías y catálogos se definirán junto con los módulos de casos y protocolos.</p>
          <RouterLink :to="{ name: 'system-status' }" class="inline-flex items-center gap-1.5 rounded font-medium text-sky-700 hover:underline">
            Ver estado del servicio<AppIcon name="chevron-right" :size="15" />
          </RouterLink>
        </div>
      </SectionCard>
    </div>
  </div>
</template>
