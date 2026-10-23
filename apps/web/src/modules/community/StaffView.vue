<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Button from 'primevue/button';
import AppIcon from '@/components/AppIcon.vue';
import AppTable from '@/components/AppTable.vue';
import NoEstablishment from '@/components/NoEstablishment.vue';
import PageHeader from '@/components/PageHeader.vue';
import QueryState from '@/components/QueryState.vue';
import SearchToolbar from '@/components/SearchToolbar.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import type { ColumnDef, FilterDef } from '@/components/types';
import { useStaff } from '@/composables/useCommunity';
import { useDebounced } from '@/composables/useDebounced';
import { useEstablishmentContext } from '@/composables/useEstablishmentContext';
import { useSession } from '@/composables/useSession';
import { fullName } from '@/lib/format';
import { formatRut } from '@/lib/rut';
import type { StaffMember } from '@/types/api';
import StaffFormDialog from './StaffFormDialog.vue';

/** Funcionarios del establecimiento (`GET /staff`). Pueden vincularse a su cuenta de acceso; no es obligatorio que la tengan. */
const PAGE_SIZE = 20;
const { can } = useSession();
const { currentId, isPending: contextPending } = useEstablishmentContext();
const search = ref('');
const debounced = useDebounced(search);
const values = ref<Record<string, string | null>>({ active: 'true' });
const page = ref(1);
watch([debounced, values], () => { page.value = 1; }, { deep: true });

const filters: FilterDef[] = [{ field: 'active', label: 'Estado', options: [{ value: 'true', label: 'Activos' }, { value: 'false', label: 'Inactivos' }] }];
const params = computed(() => ({ establishmentId: currentId.value, page: page.value, limit: PAGE_SIZE, search: debounced.value.trim() || undefined, active: values.value.active === null ? undefined : values.value.active === 'true' }));
const query = useStaff(params);
const columns: ColumnDef[] = [
  { field: 'lastNames', header: 'Funcionario/a' }, { field: 'position', header: 'Cargo' }, { field: 'rut', header: 'RUT', minScreen: 'lg' },
  { field: 'account', header: 'Cuenta', minScreen: 'md' }, { field: 'isActive', header: 'Estado' }
];
const open = ref(false);
const editing = ref<StaffMember | null>(null);
const openForm = (member: StaffMember | null) => { editing.value = member; open.value = true; };
const emptyFresh = (items: StaffMember[]) => items.length === 0 && !debounced.value && values.value.active === 'true';
</script>

<template>
  <div>
    <PageHeader title="Funcionarios" description="Personal del establecimiento. Permite identificar a funcionarios que participan en un caso, tengan o no cuenta en la plataforma.">
      <template v-if="can('staff.manage') && currentId" #actions><Button label="Nuevo funcionario/a" @click="openForm(null)"><template #icon><AppIcon name="plus" :size="16" /></template></Button></template>
    </PageHeader>

    <NoEstablishment v-if="!currentId && !contextPending" />
    <section v-else class="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Funcionarios">
      <SearchToolbar v-model:search="search" v-model:values="values" :filters="filters" placeholder="Buscar por nombre o RUT" :total="query.data.value?.total ?? null" />
      <QueryState
        :data="query.data.value?.items" :is-pending="query.isPending.value || contextPending" :error="query.error.value" subject="los funcionarios" empty-icon="briefcase" empty-title="Aún no hay funcionarios"
        empty-description="Registre al personal que podría participar en los casos." :is-empty="emptyFresh" @retry="query.refetch()"
      >
        <template #default="{ data }">
          <AppTable :rows="data" :columns="columns" label="Funcionarios" :total="query.data.value?.total" :page="page" :limit="PAGE_SIZE" :loading="query.isFetching.value" @page="page = $event">
            <template #cell-lastNames="{ row }"><span class="font-medium">{{ row.lastNames }}, {{ row.firstNames }}</span></template>
            <template #cell-rut="{ row }"><span class="whitespace-nowrap tabular-nums">{{ row.rut ? formatRut(row.rut) : '—' }}</span></template>
            <template #cell-account="{ row }">{{ row.user?.displayName ?? 'Sin cuenta' }}</template>
            <template #cell-isActive="{ row }"><StatusBadge :status="row.isActive ? 'ACTIVO' : 'INACTIVO'" /></template>
            <template v-if="can('staff.manage')" #actions="{ row }"><Button :aria-label="`Editar a ${fullName(row)}`" :title="`Editar a ${fullName(row)}`" class="!bg-slate-100 !text-slate-700 hover:!bg-slate-200 hover:!text-slate-900" rounded size="small" @click="openForm(row)"><template #icon><AppIcon name="pencil" :size="17" /></template></Button></template>
            <template #empty><div class="px-6 py-10 text-center text-sm text-slate-600">Ningún funcionario coincide con la búsqueda o los filtros.</div></template>
          </AppTable>
        </template>
      </QueryState>
    </section>

    <StaffFormDialog v-if="currentId" v-model:visible="open" :establishment-id="currentId" :member="editing" @reload="query.refetch()" />
  </div>
</template>
