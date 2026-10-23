<script setup lang="ts">
import { RouterLink } from 'vue-router';
import Button from 'primevue/button';
import AppIcon from '@/components/AppIcon.vue';
import DetailPanel from '@/components/DetailPanel.vue';
import PageHeader from '@/components/PageHeader.vue';
import SectionCard from '@/components/SectionCard.vue';
import { useEstablishmentContext } from '@/composables/useEstablishmentContext';
import { useSession } from '@/composables/useSession';
import { ROLE_LABELS, roleLabel } from '@/lib/roles';

/**
 * Configuración de la cuenta. Muestra solo datos reales de la sesión. La API no tiene endpoints de preferencias, de configuración
 * institucional ni de año escolar, por lo que esas opciones no se simulan (ver docs/frontend/api-integration.md).
 */
const { user, can } = useSession();
const establishment = useEstablishmentContext();
</script>

<template>
  <div>
    <PageHeader title="Configuración" description="Datos de su cuenta, seguridad y estado del servicio." />
    <div class="grid gap-4 lg:grid-cols-2">
      <SectionCard dense title="Mi perfil">
        <DetailPanel v-if="user" :columns="1" :items="[{ key: 'n', label: 'Nombre', value: user.displayName }, { key: 'e', label: 'Correo', value: user.email }, { key: 'r', label: 'Roles' }]">
          <template #item-r>
            <ul class="space-y-2"><li v-for="r in user.roles" :key="r"><span class="font-medium text-slate-900">{{ roleLabel(r) }}</span><span class="block text-xs text-slate-500">{{ ROLE_LABELS[r]?.description }}</span></li></ul>
          </template>
        </DetailPanel>
        <p class="mt-4 text-xs leading-relaxed text-slate-500">Los datos de la cuenta los modifica quien administra el sistema.</p>
      </SectionCard>

      <SectionCard dense title="Seguridad de la cuenta">
        <ul class="space-y-4 text-sm">
          <li>
            <p class="font-medium text-slate-900">Contraseña</p>
            <p class="mt-0.5 leading-relaxed text-slate-600">Para cambiarla, solicite un código de recuperación por correo. Al usarlo se cierran todas sus sesiones.</p>
            <RouterLink :to="{ name: 'forgot-password' }" custom><template #default="{ navigate, href }"><Button as="a" :href="href" label="Solicitar código de cambio" size="small" outlined class="mt-2" @click="navigate" /></template></RouterLink>
          </li>
          <li class="border-t border-slate-100 pt-4">
            <p class="font-medium text-slate-900">Sesión</p>
            <p class="mt-0.5 leading-relaxed text-slate-600">La sesión dura hasta 12 horas y se cierra si la administración revoca su acceso. Se guarda en una cookie protegida; este sitio no almacena contraseñas ni tokens.</p>
          </li>
        </ul>
      </SectionCard>

      <SectionCard dense title="Establecimiento">
        <p v-if="establishment.options.value.length" class="text-sm text-slate-700">Establecimiento de trabajo: <strong>{{ establishment.nameOf(establishment.currentId.value ?? '') }}</strong>.</p>
        <p v-else class="text-sm text-slate-600">No hay un establecimiento disponible para su cuenta todavía.</p>
        <RouterLink v-if="can('institutions.read')" :to="{ name: 'establishments' }" class="mt-3 inline-flex items-center gap-1.5 rounded text-sm font-medium text-sky-700 hover:underline"><AppIcon name="building" :size="15" />Administrar establecimientos</RouterLink>
        <p class="mt-4 text-xs leading-relaxed text-slate-500">El año escolar, las preferencias y los catálogos institucionales no tienen API todavía y no se pueden configurar desde aquí.</p>
      </SectionCard>

      <SectionCard dense title="Servicio">
        <p class="text-sm leading-relaxed text-slate-600">Compruebe la conexión entre la interfaz, la API y la base de datos.</p>
        <RouterLink :to="{ name: 'system-status' }" class="mt-3 inline-flex items-center gap-1.5 rounded text-sm font-medium text-sky-700 hover:underline">Ver estado del servicio<AppIcon name="chevron-right" :size="15" /></RouterLink>
      </SectionCard>
    </div>
  </div>
</template>
