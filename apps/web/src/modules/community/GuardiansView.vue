<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import AppIcon from '@/components/AppIcon.vue';
import AppTable from '@/components/AppTable.vue';
import NoEstablishment from '@/components/NoEstablishment.vue';
import PageHeader from '@/components/PageHeader.vue';
import QueryState from '@/components/QueryState.vue';
import SearchToolbar from '@/components/SearchToolbar.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import type { ColumnDef, FilterDef } from '@/components/types';
import { useGuardians } from '@/composables/useCommunity';
import { useDebounced } from '@/composables/useDebounced';
import { useEstablishmentContext } from '@/composables/useEstablishmentContext';
import { useSession } from '@/composables/useSession';
import { fullName } from '@/lib/format';
import { formatRut } from '@/lib/rut';
import type { Guardian } from '@/types/api';
import GuardianFormDialog from './GuardianFormDialog.vue';

/** Apoderados del establecimiento (`GET /guardians`, con búsqueda por nombre o RUT y paginación del servidor). */
const PAGE_SIZE = 20;
const { can } = useSession();
const router = useRouter();
const { currentId, isPending: contextPending } = useEstablishmentContext();
const search = ref('');
const debounced = useDebounced(search);
const values = ref<Record<string, string | null>>({ active: 'true' });
const page = ref(1);
watch([debounced, values], () => { page.value = 1; }, { deep: true });

const filters: FilterDef[] = [{ field: 'active', label: 'Estado', options: [{ value: 'true', label: 'Activos' }, { value: 'false', label: 'Inactivos' }] }];
const params = computed(() => ({ establishmentId: currentId.value, page: page.value, limit: PAGE_SIZE, search: debounced.value.trim() || undefined, active: values.value.active === null ? undefined : values.value.active === 'true' }));
const query = useGuardians(params);
const columns: ColumnDef[] = [
  { field: 'lastNames', header: 'Apoderado/a' }, { field: 'rut', header: 'RUT', minScreen: 'md' }, { field: 'phone', header: 'Teléfono', minScreen: 'sm' },
  { field: 'students', header: 'Estudiantes', minScreen: 'lg', align: 'right' }, { field: 'isActive', header: 'Estado' }
];
const rowTo = (guardian: Guardian) => ({ name: 'guardians-detail', params: { id: guardian.id } });
const createOpen = ref(false);
const emptyFresh = (items: Guardian[]) => items.length === 0 && !debounced.value && values.value.active === 'true';
</script>

<template>
  <div>
    <PageHeader title="Apoderados" description="Personas responsables de los estudiantes. Se usan para citaciones y para identificar a quienes participan en un caso.">
      <template v-if="can('guardians.manage') && currentId" #actions><Button label="Nuevo apoderado/a" @click="createOpen = true"><template #icon><AppIcon name="plus" :size="16" /></template></Button></template>
    </PageHeader>

    <NoEstablishment v-if="!currentId && !contextPending" />
    <section v-else class="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Apoderados">
      <SearchToolbar v-model:search="search" v-model:values="values" :filters="filters" placeholder="Buscar por nombre o RUT" :total="query.data.value?.total ?? null" />
      <QueryState
        :data="query.data.value?.items" :is-pending="query.isPending.value || contextPending" :error="query.error.value" subject="los apoderados" empty-icon="users" empty-title="Aún no hay apoderados"
        empty-description="Registre apoderados aquí o directamente desde la ficha de un estudiante." :is-empty="emptyFresh" @retry="query.refetch()"
      >
        <template #default="{ data }">
          <AppTable :rows="data" :columns="columns" label="Apoderados" :total="query.data.value?.total" :page="page" :limit="PAGE_SIZE" :loading="query.isFetching.value" :row-to="rowTo" :detail-label="(g) => `Ver ficha de ${fullName(g)}`" @page="page = $event">
            <template #cell-lastNames="{ row }"><span class="font-medium">{{ row.lastNames }}, {{ row.firstNames }}</span></template>
            <template #cell-rut="{ row }"><span class="whitespace-nowrap tabular-nums">{{ row.rut ? formatRut(row.rut) : '—' }}</span></template>
            <template #cell-students="{ row }"><span class="tabular-nums">{{ row._count?.studentLinks ?? 0 }}</span></template>
            <template #cell-isActive="{ row }"><StatusBadge :status="row.isActive ? 'ACTIVO' : 'INACTIVO'" /></template>
            <template #empty><div class="px-6 py-10 text-center text-sm text-slate-600">Ningún apoderado coincide con la búsqueda o los filtros.</div></template>
          </AppTable>
        </template>
      </QueryState>
    </section>

    <GuardianFormDialog v-if="currentId" v-model:visible="createOpen" :establishment-id="currentId" :guardian="null" @saved="(g) => router.push({ name: 'guardians-detail', params: { id: g.id } })" @reload="query.refetch()" />
  </div>
</template>
