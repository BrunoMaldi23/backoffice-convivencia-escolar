<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import Menu from 'primevue/menu';
import AppIcon from '@/components/AppIcon.vue';
import ResourceListPage from '@/components/ResourceListPage.vue';
import type { UserAccount } from '@/types/models';
import UserActionDialog from './UserActionDialog.vue';
import { userColumns, userFilters, type UserAction } from './users.config';

const router = useRouter();
const menu = ref<InstanceType<typeof Menu> | null>(null);
const current = ref<UserAccount | null>(null);
const pending = ref<{ user: UserAccount; action: UserAction } | null>(null);

const items = ref<{ label: string; icon: string; command: () => void; class?: string }[]>([]);
function open(event: Event, row: Record<string, unknown>) {
  const user = row as unknown as UserAccount;
  current.value = user;
  const ask = (action: UserAction) => () => (pending.value = { user, action });
  items.value = [
    { label: 'Editar datos', icon: 'pencil', command: () => router.push({ name: 'users-edit', params: { id: user.id } }) },
    ...(user.status === 'invitado' ? [{ label: 'Reenviar invitación', icon: 'send', command: ask('resend') }] : []),
    ...(user.status === 'activo' ? [{ label: 'Revocar sesiones', icon: 'rotate-key', command: ask('revoke') }] : []),
    ...(user.status === 'activo' ? [{ label: 'Desactivar', icon: 'ban', command: ask('disable'), class: 'text-red-800' }] : []),
    ...(user.status === 'inactivo' ? [{ label: 'Reactivar', icon: 'check-circle', command: ask('enable') }] : [])
  ];
  menu.value?.toggle(event);
}
</script>

<template>
  <div>
    <ResourceListPage
      resource="users" title="Usuarios" description="Cuentas de acceso del personal. Las cuentas nuevas se activan mediante una invitación enviada por correo."
      :columns="userColumns" :filters="userFilters" :search-fields="['displayName', 'email']" search-placeholder="Buscar por nombre o correo"
      detail-route="users-detail" :create="{ to: { name: 'users-new' }, label: 'Nuevo usuario' }" subject="los usuarios" empty-icon="user"
      empty-title="No hay usuarios registrados"
    >
      <template #row-actions="{ row }">
        <button
          type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          :aria-label="`Acciones para ${row.displayName}`" aria-haspopup="menu" @click="open($event, row)"
        ><AppIcon name="more" :size="18" /></button>
      </template>
    </ResourceListPage>

    <Menu ref="menu" :model="items" popup :aria-label="current ? `Acciones para ${current.displayName}` : 'Acciones'">
      <template #item="{ item, props: p }">
        <a v-bind="p.action" :class="['flex items-center gap-2.5 px-3 py-2 text-sm', item.class ?? 'text-slate-700']">
          <AppIcon :name="String(item.icon)" :size="16" />{{ item.label }}
        </a>
      </template>
    </Menu>

    <UserActionDialog :user="pending?.user ?? null" :action="pending?.action ?? null" @close="pending = null" />
  </div>
</template>
