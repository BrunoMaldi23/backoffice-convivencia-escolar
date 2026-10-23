<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import Button from 'primevue/button';
import MultiSelect from 'primevue/multiselect';
import AppIcon from '@/components/AppIcon.vue';
import ConfirmActionDialog from '@/components/ConfirmActionDialog.vue';
import DetailPanel from '@/components/DetailPanel.vue';
import EmptyState from '@/components/EmptyState.vue';
import ResourceDetailShell from '@/components/ResourceDetailShell.vue';
import SectionCard from '@/components/SectionCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { useSession } from '@/composables/useSession';
import { formatDate, formatDateTime, initials } from '@/lib/format';
import { roleLabel } from '@/lib/roles';
import { submitResource } from '@/services/resources';
import type { UserAccount } from '@/types/models';
import UserActionDialog from './UserActionDialog.vue';
import { assignableRoles, roleDescription, type UserAction } from './users.config';

defineProps<{ id: string }>();
const { user: session } = useSession();
const pending = ref<{ user: UserAccount; action: UserAction } | null>(null);
const rolesOpen = ref(false);
const newRoles = ref<string[]>([]);
function editRoles(u: UserAccount) {
  newRoles.value = [...u.roles];
  rolesOpen.value = true;
}
</script>

<template>
  <ResourceDetailShell :id="id" resource="users" subject="el usuario" :back="{ to: { name: 'users' }, label: 'Volver a usuarios' }" :title="(u) => u.displayName" :description="(u) => u.email">
    <template #badges="{ item }"><StatusBadge :status="item.status" /></template>
    <template #actions="{ item }">
      <RouterLink :to="{ name: 'users-edit', params: { id: item.id } }" custom>
        <template #default="{ navigate, href }"><Button as="a" :href="href" label="Editar datos" severity="secondary" outlined @click="navigate"><template #icon><AppIcon name="pencil" :size="15" /></template></Button></template>
      </RouterLink>
    </template>

    <template #default="{ item }">
      <div class="grid gap-6 lg:grid-cols-3">
        <div class="space-y-6 lg:col-span-2">
          <SectionCard title="Cuenta">
            <div class="mb-6 flex items-center gap-4">
              <span class="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 font-semibold text-sky-800">{{ initials(item.displayName) }}</span>
              <div><p class="font-semibold text-slate-900">{{ item.displayName }}</p><p class="text-sm text-slate-600">{{ item.email }}</p></div>
            </div>
            <DetailPanel :items="[
              { key: 'status', label: 'Estado' }, { key: 'created', label: 'Fecha de creación', value: formatDate(item.createdAt) },
              { key: 'login', label: 'Último ingreso', value: item.lastLoginAt ? formatDateTime(item.lastLoginAt) : 'Nunca ha iniciado sesión' }
            ]">
              <template #item-status><StatusBadge :status="item.status" /></template>
            </DetailPanel>
            <p v-if="item.status === 'invitado'" class="mt-5 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
              La invitación está pendiente. La cuenta no puede activarse manualmente: la persona debe usar el código enviado por correo.
            </p>
          </SectionCard>

          <SectionCard title="Roles asignados" description="Cambiar los roles cierra todas las sesiones activas del usuario.">
            <template #actions><Button label="Cambiar roles" size="small" outlined @click="editRoles(item)" /></template>
            <ul class="divide-y divide-slate-100">
              <li v-for="r in item.roles" :key="r" class="py-3 first:pt-0 last:pb-0">
                <p class="text-sm font-medium text-slate-900">{{ roleLabel(r) }} <span class="ml-1 text-xs font-normal text-slate-500">{{ r }}</span></p>
                <p class="mt-0.5 text-sm text-slate-600">{{ roleDescription(r) }}</p>
              </li>
            </ul>
          </SectionCard>

          <SectionCard title="Actividad reciente">
            <EmptyState compact icon="history" title="Sin eventos para mostrar" description="Los eventos de auditoría de esta cuenta se consultarán con el permiso de auditoría." />
          </SectionCard>
        </div>

        <SectionCard title="Seguridad">
          <ul class="space-y-4 text-sm">
            <li v-if="item.status === 'invitado'">
              <p class="font-medium text-slate-900">Invitación</p>
              <p class="mt-0.5 text-slate-600">Envía un código nuevo e invalida el anterior.</p>
              <Button label="Reenviar invitación" size="small" outlined class="mt-2" @click="pending = { user: item, action: 'resend' }" />
            </li>
            <li v-if="item.status === 'activo'">
              <p class="font-medium text-slate-900">Sesiones</p>
              <p class="mt-0.5 text-slate-600">Cierra la sesión en todos los dispositivos.</p>
              <Button label="Revocar sesiones" size="small" outlined class="mt-2" @click="pending = { user: item, action: 'revoke' }" />
            </li>
            <li class="border-t border-slate-100 pt-4">
              <p class="font-medium text-slate-900">Acceso</p>
              <template v-if="item.status === 'activo'">
                <p class="mt-0.5 text-slate-600">Impide el ingreso sin eliminar el historial.</p>
                <Button label="Desactivar usuario" size="small" severity="danger" outlined class="mt-2" @click="pending = { user: item, action: 'disable' }" />
              </template>
              <template v-else-if="item.status === 'inactivo'">
                <p class="mt-0.5 text-slate-600">La cuenta está desactivada.</p>
                <Button label="Reactivar usuario" size="small" outlined class="mt-2" @click="pending = { user: item, action: 'enable' }" />
              </template>
              <p v-else class="mt-0.5 text-slate-600">Disponible cuando la cuenta esté activada.</p>
            </li>
          </ul>
          <p class="mt-6 text-xs leading-relaxed text-slate-500">Las cuentas no se eliminan: se desactivan para conservar la trazabilidad.</p>
        </SectionCard>
      </div>

      <UserActionDialog :user="pending?.user ?? null" :action="pending?.action ?? null" @close="pending = null" />

      <ConfirmActionDialog
        v-model:visible="rolesOpen" header="Cambiar roles" confirm-label="Guardar roles" action-name="el cambio de roles"
        :message="`Seleccione los roles de ${item.displayName}. Al guardar, se cerrarán todas sus sesiones activas.`"
        :action="() => submitResource('users', 'PATCH', `/${item.id}/roles`)"
      >
        <label for="roles-select" class="mt-4 block text-sm font-medium text-slate-800">Roles</label>
        <MultiSelect v-model="newRoles" input-id="roles-select" :options="assignableRoles(session)" option-label="label" option-value="value" option-disabled="disabled" display="chip" class="mt-1.5 w-full" />
        <p class="mt-2 text-xs text-slate-500">Nadie puede asignarse a sí mismo el rol de administración del sistema.</p>
      </ConfirmActionDialog>
    </template>
  </ResourceDetailShell>
</template>
