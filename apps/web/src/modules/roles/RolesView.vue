<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import SelectButton from 'primevue/selectbutton';
import AppIcon from '@/components/AppIcon.vue';
import AppTable from '@/components/AppTable.vue';
import EmptyState from '@/components/EmptyState.vue';
import PageHeader from '@/components/PageHeader.vue';
import QueryState from '@/components/QueryState.vue';
import SectionCard from '@/components/SectionCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import type { ColumnDef } from '@/components/types';
import { usePermissions, useRoles, useUserList } from '@/composables/useAdmin';
import { useSession } from '@/composables/useSession';
import { isKnownPermission, PERMISSION_GROUPS, ROLE_LABELS, roleLabel } from '@/lib/roles';
import type { AdminUser, Role } from '@/types/api';

/**
 * Roles y permisos en solo lectura (`GET /roles`, `GET /permissions`). La asignación de roles a personas se hace desde la ficha
 * del usuario. La API no ofrece edición de la matriz, por lo que esta pantalla no la modifica.
 */
const route = useRoute();
const router = useRouter();
const { can } = useSession();
const roles = useRoles();
const permissions = usePermissions();
const view = ref<'roles' | 'matrix'>('roles');
const selectedName = computed<string | null>({ get: () => (typeof route.query.rol === 'string' ? route.query.rol : null), set: (v) => { void router.replace({ query: { ...route.query, rol: v ?? undefined } }); } });
const selected = computed(() => roles.data.value?.find((r) => r.name === selectedName.value) ?? null);
const holders = useUserList(() => ({ page: 1, limit: 50, role: selected.value?.name }));
const groups = computed(() => {
  const unknown = (permissions.data.value ?? []).filter((p) => !isKnownPermission(p.code)).map((p) => ({ code: p.code, label: p.description || p.code }));
  return unknown.length ? [...PERMISSION_GROUPS, { area: 'Otros', permissions: unknown }] : PERMISSION_GROUPS;
});
const granted = (role: Role, code: string) => role.permissions.includes(code);
const userColumns: ColumnDef[] = [{ field: 'displayName', header: 'Nombre' }, { field: 'email', header: 'Correo', minScreen: 'md' }, { field: 'isActive', header: 'Estado' }];
</script>

<template>
  <div>
    <PageHeader title="Roles y permisos" description="Roles institucionales y los permisos que concede cada uno. La asignación de roles se hace desde la ficha de cada usuario.">
      <template #badges><span class="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"><AppIcon name="lock" :size="13" />Solo lectura</span></template>
      <template #actions><SelectButton v-model="view" :options="[{ label: 'Roles', value: 'roles' }, { label: 'Matriz de permisos', value: 'matrix' }]" option-label="label" option-value="value" :allow-empty="false" aria-label="Vista" /></template>
    </PageHeader>

    <div :class="roles.data.value?.length ? '' : 'rounded-xl border border-slate-200 bg-white'">
      <QueryState :data="roles.data.value" :is-pending="roles.isPending.value" :error="roles.error.value" empty-icon="key" empty-title="No hay roles definidos" subject="los roles" @retry="roles.refetch()">
        <template #default="{ data }">
          <div v-if="view === 'roles'" class="grid gap-4 lg:grid-cols-5">
            <ul class="space-y-2 lg:col-span-2" aria-label="Roles">
              <li v-for="role in data" :key="role.id">
                <button type="button" :aria-current="selectedName === role.name ? 'true' : undefined" :class="['flex w-full items-start justify-between gap-3 rounded-xl border bg-white p-4 text-left hover:border-slate-300', selectedName === role.name ? 'border-sky-600 ring-1 ring-sky-600' : 'border-slate-200']" @click="selectedName = role.name">
                  <span class="min-w-0">
                    <span class="block font-semibold text-slate-900">{{ roleLabel(role.name) }}</span>
                    <span class="block text-xs text-slate-500">{{ role.name }}</span>
                    <span class="mt-1 block text-sm text-slate-600">{{ ROLE_LABELS[role.name]?.description }}</span>
                    <span class="mt-2 block text-xs tabular-nums text-slate-500">{{ role.permissions.length }} {{ role.permissions.length === 1 ? 'permiso' : 'permisos' }}</span>
                  </span>
                  <AppIcon name="chevron-right" :size="17" class="mt-1 shrink-0 text-slate-400" />
                </button>
              </li>
            </ul>

            <div class="space-y-4 lg:col-span-3">
              <SectionCard v-if="selected" dense :title="roleLabel(selected.name)" :description="`Código ${selected.name}. ${selected.permissions.length} permisos.`">
                <div v-for="g in groups" :key="g.area" class="mb-4 last:mb-0">
                  <h3 class="mb-1.5 text-xs font-semibold text-slate-500">{{ g.area }}</h3>
                  <ul class="space-y-1.5">
                    <li v-for="p in g.permissions" :key="p.code" :class="['flex items-center gap-2.5 text-sm', granted(selected, p.code) ? 'text-slate-900' : 'text-slate-500']">
                      <AppIcon :name="granted(selected, p.code) ? 'check-circle' : 'circle'" :size="16" :class="granted(selected, p.code) ? 'text-emerald-700' : 'text-slate-300'" />{{ p.label }}<span class="sr-only">{{ granted(selected, p.code) ? '(concedido)' : '(no concedido)' }}</span>
                    </li>
                  </ul>
                </div>
                <p class="mt-4 rounded-md bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">Los permisos no bastan por sí solos: el acceso a cada expediente además exige pertenecer al establecimiento y ser creador, responsable o tener un acceso concedido.</p>
              </SectionCard>
              <SectionCard v-if="selected" dense title="Personas con este rol" flush>
                <p v-if="!can('users.read')" class="px-4 py-6 text-center text-sm text-slate-600">Su rol no puede listar usuarios.</p>
                <QueryState v-else :data="holders.data.value?.items" :is-pending="holders.isPending.value" :error="holders.error.value" compact :rows="3" empty-icon="user" empty-title="Nadie tiene este rol" subject="los usuarios" @retry="holders.refetch()">
                  <template #default="{ data: users }">
                    <AppTable :rows="users" :columns="userColumns" label="Personas con el rol" :page-size="8" :row-to="(u: AdminUser) => ({ name: 'users-detail', params: { id: u.id } })" :detail-label="(u) => `Ver ${u.displayName}`">
                      <template #cell-isActive="{ row }"><StatusBadge :status="row.isActive ? 'ACTIVO' : 'INACTIVO'" /></template>
                    </AppTable>
                  </template>
                </QueryState>
              </SectionCard>
              <div v-else class="rounded-xl border border-slate-200 bg-white"><EmptyState icon="key" title="Seleccione un rol" description="Elija un rol de la lista para ver sus permisos y las personas que lo tienen." /></div>
            </div>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full min-w-[56rem] text-sm">
              <caption class="sr-only">Matriz de permisos por rol. Marca verde: permiso concedido; guion: no concedido.</caption>
              <thead>
                <tr class="border-b border-slate-200 bg-slate-50">
                  <th scope="col" class="sticky left-0 bg-slate-50 px-4 py-3 text-left font-semibold text-slate-600">Permiso</th>
                  <th v-for="r in data" :key="r.id" scope="col" class="px-2 py-3 text-center text-xs font-semibold text-slate-600"><span class="block max-w-24 leading-tight">{{ roleLabel(r.name) }}</span></th>
                </tr>
              </thead>
              <tbody>
                <template v-for="g in groups" :key="g.area">
                  <tr><th :colspan="data.length + 1" scope="colgroup" class="bg-white px-4 pb-1 pt-4 text-left text-xs font-semibold text-slate-500">{{ g.area }}</th></tr>
                  <tr v-for="p in g.permissions" :key="p.code" class="border-b border-slate-100">
                    <th scope="row" class="sticky left-0 bg-white px-4 py-2 text-left font-normal"><span class="block text-slate-800">{{ p.label }}</span><span class="block text-xs text-slate-500">{{ p.code }}</span></th>
                    <td v-for="r in data" :key="r.id" class="px-2 py-2 text-center">
                      <AppIcon v-if="granted(r, p.code)" name="check-circle" :size="17" class="mx-auto text-emerald-700" :label="`${roleLabel(r.name)}: concedido`" />
                      <span v-else class="text-slate-300" :aria-label="`${roleLabel(r.name)}: no concedido`">–</span>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
            <p class="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">Matriz de solo lectura. Los permisos efectivos se verifican en el servidor en cada solicitud.</p>
          </div>
        </template>
      </QueryState>
    </div>
  </div>
</template>
