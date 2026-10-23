<script setup lang="ts">
import { computed } from 'vue';
import AppIcon from '@/components/AppIcon.vue';
import QueryState from '@/components/QueryState.vue';
import ResourceDetailShell from '@/components/ResourceDetailShell.vue';
import ResourceTable from '@/components/ResourceTable.vue';
import SectionCard from '@/components/SectionCard.vue';
import { useResource } from '@/composables/useResource';
import { PERMISSION_GROUPS, ROLE_LABELS, roleLabel } from '@/lib/roles';
import type { RoleItem } from '@/types/models';
import { userColumns } from '../users/users.config';

/** Detalle de rol: permisos concedidos y personas que lo tienen. La API identifica el rol por UUID; la demostración por nombre. */
defineProps<{ id: string }>();
const users = useResource('users');
const holders = (role: string) => (users.data.value ? users.data.value.filter((u) => u.roles.includes(role)) : undefined);
const columns = userColumns.filter((c) => c.field !== 'roles');
const total = computed(() => PERMISSION_GROUPS.flatMap((g) => g.permissions).length);
const granted = (r: RoleItem, code: string) => r.permissions.includes(code);
</script>

<template>
  <ResourceDetailShell
    :id="id" resource="roles" subject="el rol" :back="{ to: { name: 'roles' }, label: 'Volver a roles' }"
    :title="(r) => roleLabel(r.name)" :description="(r) => r.description || ROLE_LABELS[r.name]?.description || r.name"
  >
    <template #default="{ item }">
      <div class="grid gap-6 lg:grid-cols-5">
        <SectionCard title="Permisos del rol" :description="`Código ${item.name}. ${item.permissions.length} de ${total} permisos administrativos.`" class="lg:col-span-2">
          <div v-for="g in PERMISSION_GROUPS" :key="g.area" class="mb-5 last:mb-0">
            <h3 class="mb-2 text-xs font-semibold text-slate-500">{{ g.area }}</h3>
            <ul class="space-y-2">
              <li v-for="p in g.permissions" :key="p.code" :class="['flex items-center gap-2.5 text-sm', granted(item, p.code) ? 'text-slate-900' : 'text-slate-500']">
                <AppIcon :name="granted(item, p.code) ? 'check-circle' : 'circle'" :size="16" :class="granted(item, p.code) ? 'text-emerald-700' : 'text-slate-300'" />
                {{ p.label }}<span class="sr-only">{{ granted(item, p.code) ? '(concedido)' : '(no concedido)' }}</span>
              </li>
            </ul>
          </div>
          <p class="mt-6 rounded-md bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">Ningún rol obtiene acceso automático a expedientes; esos permisos se definirán en fases posteriores.</p>
        </SectionCard>
        <SectionCard title="Usuarios con este rol" flush class="lg:col-span-3">
          <QueryState
            :data="holders(item.name)" :is-pending="users.isPending.value" :error="users.error.value" compact :rows="3"
            empty-title="Sin usuarios asignados" empty-icon="user" subject="los usuarios" @retry="users.refetch()"
          >
            <template #default="{ data }">
              <ResourceTable :rows="data as unknown as Record<string, unknown>[]" :columns="columns" detail-route="users-detail" label="Usuarios con el rol" :page-size="8" />
            </template>
          </QueryState>
        </SectionCard>
      </div>
    </template>
  </ResourceDetailShell>
</template>
