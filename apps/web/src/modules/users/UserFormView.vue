<script setup lang="ts">
import { computed } from 'vue';
import AppIcon from '@/components/AppIcon.vue';
import PageHeader from '@/components/PageHeader.vue';
import ResourceForm from '@/components/ResourceForm.vue';
import type { FormSectionDef } from '@/components/types';
import { useSession } from '@/composables/useSession';
import { assignableRoles } from './users.config';

/**
 * Crear usuario (`POST /api/users`: correo, nombre y roles) o editar (`PATCH /api/users/:id`: solo correo y nombre).
 * No se define contraseña: la persona la crea con el código de invitación. Los roles se cambian desde el detalle.
 */
const props = defineProps<{ id?: string }>();
const editing = computed(() => Boolean(props.id));
const { user } = useSession();

const sections = computed<FormSectionDef[]>(() => [
  {
    title: 'Datos de la cuenta',
    fields: [
      { name: 'displayName', label: 'Nombre completo', type: 'text', required: true },
      { name: 'email', label: 'Correo institucional', type: 'email', required: true, help: 'Recibirá aquí el código para activar su cuenta.' }
    ]
  },
  ...(editing.value ? [] : [{
    title: 'Roles autorizados',
    description: 'Asigne solo los roles necesarios para las funciones de la persona. Los permisos efectivos los valida el servidor.',
    fields: [{ name: 'roles', label: 'Roles', type: 'multiselect' as const, required: true, options: assignableRoles(user.value), full: true }]
  }])
]);
</script>

<template>
  <div class="max-w-3xl">
    <PageHeader
      :title="editing ? 'Editar usuario' : 'Nuevo usuario'"
      :description="editing ? 'Actualice el nombre o el correo. Para cambiar roles, use la ficha del usuario.' : 'Cree la cuenta y envíe una invitación segura por correo.'"
      :back="editing ? { to: { name: 'users-detail', params: { id } }, label: 'Volver al usuario' } : { to: { name: 'users' }, label: 'Volver a usuarios' }"
    />
    <div v-if="!editing" class="mb-6 flex gap-3 rounded-lg border border-sky-100 bg-sky-50/60 px-4 py-3 text-sm text-slate-700">
      <AppIcon name="mail" :size="17" class="mt-0.5 text-sky-800" />
      <p>La cuenta queda inactiva hasta que la persona cree su contraseña con el código de un solo uso que recibirá por correo. La administración nunca ve ni define contraseñas.</p>
    </div>
    <ResourceForm
      :key="String(editing)" :sections="sections" resource="users" :method="editing ? 'PATCH' : 'POST'" :submit-label="editing ? 'Guardar cambios' : 'Crear y enviar invitación'"
      :action-name="editing ? 'la actualización del usuario' : 'la creación del usuario'" :cancel-to="editing ? { name: 'users-detail', params: { id } } : { name: 'users' }" id-prefix="usuario"
    />
  </div>
</template>
