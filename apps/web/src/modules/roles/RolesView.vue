<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import SelectButton from 'primevue/selectbutton';
import AppIcon from '@/components/AppIcon.vue';
import PageHeader from '@/components/PageHeader.vue';
import PreviewBadge from '@/components/PreviewBadge.vue';
import QueryState from '@/components/QueryState.vue';
import { useResource } from '@/composables/useResource';
import { PERMISSION_GROUPS, ROLE_LABELS, roleLabel } from '@/lib/roles';

/**
 * Roles y matriz de permisos en modo lectura. La matriz proviene de `GET /api/roles`; el frontend no otorga
 * permisos por defecto ni permite editarlos (el backend no expone esa operación).
 */
const query = useResource('roles');
const view = ref<'roles' | 'matrix'>('roles');
</script>

<template>
  <div>
    <PageHeader title="Roles y permisos" description="Roles institucionales y permisos que concede cada uno. La asignación de roles a personas se hace desde Usuarios.">
      <template #badges><PreviewBadge /></template>
      <template #actions>
        <SelectButton v-model="view" :options="[{ label: 'Roles', value: 'roles' }, { label: 'Matriz de permisos', value: 'matrix' }]" option-label="label" option-value="value" :allow-empty="false" aria-label="Vista" />
      </template>
    </PageHeader>

    <div class="rounded-xl border border-slate-200 bg-white" :class="view === 'roles' && query.data.value ? '!border-0 !bg-transparent' : ''">
      <QueryState :data="query.data.value" :is-pending="query.isPending.value" :error="query.error.value" subject="los roles" empty-icon="key" empty-title="No hay roles definidos" @retry="query.refetch()">
        <template #default="{ data }">
          <ul v-if="view === 'roles'" class="grid gap-3 md:grid-cols-2">
            <li v-for="r in data" :key="r.name">
              <RouterLink :to="{ name: 'roles-detail', params: { id: r.name } }" class="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300">
                <span class="flex items-start justify-between gap-3">
                  <span>
                    <span class="block font-semibold text-slate-900">{{ roleLabel(r.name) }}</span>
                    <span class="block text-xs text-slate-500">{{ r.name }}</span>
                  </span>
                  <AppIcon name="chevron-right" :size="17" class="text-slate-400" />
                </span>
                <span class="mt-2 block text-sm leading-relaxed text-slate-600">{{ r.description || ROLE_LABELS[r.name]?.description }}</span>
                <span class="mt-auto flex gap-4 pt-3 text-xs tabular-nums text-slate-500">
                  <span>{{ r.permissions.length }} {{ r.permissions.length === 1 ? 'permiso' : 'permisos' }}</span>
                  <span>{{ r.users }} {{ r.users === 1 ? 'usuario' : 'usuarios' }}</span>
                </span>
              </RouterLink>
            </li>
          </ul>

          <div v-else class="overflow-x-auto">
            <table class="w-full min-w-[56rem] text-sm">
              <caption class="sr-only">Matriz de permisos por rol. Marca verde: permiso concedido; guion: no concedido.</caption>
              <thead>
                <tr class="border-b border-slate-200 bg-slate-50">
                  <th scope="col" class="sticky left-0 bg-slate-50 px-4 py-3 text-left font-semibold text-slate-600">Permiso</th>
                  <th v-for="r in data" :key="r.name" scope="col" class="px-2 py-3 text-center text-xs font-semibold text-slate-600">
                    <span class="block max-w-24 leading-tight">{{ roleLabel(r.name) }}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <template v-for="g in PERMISSION_GROUPS" :key="g.area">
                  <tr><th :colspan="data.length + 1" scope="colgroup" class="bg-white px-4 pb-1 pt-4 text-left text-xs font-semibold text-slate-500">{{ g.area }}</th></tr>
                  <tr v-for="p in g.permissions" :key="p.code" class="border-b border-slate-100">
                    <th scope="row" class="sticky left-0 bg-white px-4 py-2.5 text-left font-normal">
                      <span class="block text-slate-800">{{ p.label }}</span><span class="block text-xs text-slate-500">{{ p.code }}</span>
                    </th>
                    <td v-for="r in data" :key="r.name" class="px-2 py-2.5 text-center">
                      <AppIcon v-if="r.permissions.includes(p.code)" name="check-circle" :size="17" class="mx-auto text-emerald-700" :label="`${roleLabel(r.name)}: concedido`" />
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
