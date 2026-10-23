<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import Button from 'primevue/button';
import AppIcon from '@/components/AppIcon.vue';
import AppTable from '@/components/AppTable.vue';
import PageHeader from '@/components/PageHeader.vue';
import PriorityBadge from '@/components/PriorityBadge.vue';
import QueryState from '@/components/QueryState.vue';
import SearchToolbar from '@/components/SearchToolbar.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import type { ColumnDef, FilterDef } from '@/components/types';
import { useAllCases } from '@/composables/useCases';
import { useDirectory } from '@/composables/useDirectory';
import { useSession } from '@/composables/useSession';
import { CATEGORY_OPTIONS, categoryLabel, formatFolio } from '@/lib/catalogs';
import { formatDate, formatDateTime, isOverdue } from '@/lib/format';
import { isActiveCase } from '@/lib/metrics';
import { optionsFrom, priorityOptions } from '@/lib/status';
import { CASE_STATUSES, type CaseRecord } from '@/types/api';

/**
 * Listado de expedientes. Se traen todos los autorizados (hasta 300) y la búsqueda, los filtros y el orden se aplican en el
 * navegador, porque la API no ofrece búsqueda por texto. Si hubiera más de 300, se avisa y los filtros de estado y prioridad
 * siguen disponibles sobre los más recientes.
 */
const route = useRoute();
const { user, can } = useSession();
const { nameOf } = useDirectory();
const query = useAllCases();

const search = ref('');
const pick = (key: string) => (typeof route.query[key] === 'string' ? (route.query[key] as string) : null);
const values = ref<Record<string, string | null>>({ status: pick('estado'), priority: pick('prioridad'), category: null, owner: null });

const filters: FilterDef[] = [
  { field: 'status', label: 'Estado', options: optionsFrom(CASE_STATUSES) },
  { field: 'priority', label: 'Prioridad', options: priorityOptions },
  { field: 'category', label: 'Categoría', options: CATEGORY_OPTIONS },
  { field: 'owner', label: 'Responsable', options: [{ value: 'me', label: 'Mis casos' }, { value: 'none', label: 'Sin asignar' }] }
];
const columns: ColumnDef[] = [
  { field: 'folio', header: 'Folio', sortable: true },
  { field: 'title', header: 'Caso', sortable: true },
  { field: 'categoryCode', header: 'Categoría', minScreen: 'lg' },
  { field: 'priority', header: 'Prioridad', minScreen: 'md' },
  { field: 'status', header: 'Estado' },
  { field: 'responsibleUserId', header: 'Responsable', minScreen: 'xl' },
  { field: 'nextActionDueAt', header: 'Próxima acción', minScreen: 'lg', sortable: true },
  { field: 'updatedAt', header: 'Actualizado', minScreen: 'xl', sortable: true }
];

const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const rows = computed(() => {
  const term = normalize(search.value.trim());
  const v = values.value;
  return (query.data.value?.items ?? []).filter((c) =>
    (!term || normalize(`${formatFolio(c.folio)} ${c.folio} ${c.title} ${categoryLabel(c.categoryCode)}`).includes(term)) &&
    (!v.status || c.status === v.status) && (!v.priority || c.priority === v.priority) && (!v.category || c.categoryCode === v.category) &&
    (!v.owner || (v.owner === 'me' ? c.responsibleUserId === user.value?.id : !c.responsibleUserId))
  );
});
const rowTo = (c: CaseRecord) => ({ name: 'cases-detail', params: { id: c.id } });
</script>

<template>
  <div>
    <PageHeader title="Casos" description="Expedientes de convivencia escolar a los que usted tiene acceso.">
      <template #actions>
        <RouterLink v-if="can('cases.create')" :to="{ name: 'cases-new' }" custom>
          <template #default="{ navigate, href }">
            <Button as="a" :href="href" label="Nuevo caso" @click="navigate"><template #icon><AppIcon name="plus" :size="16" /></template></Button>
          </template>
        </RouterLink>
      </template>
    </PageHeader>

    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="Listado de casos">
      <SearchToolbar v-model:search="search" v-model:values="values" :filters="filters" placeholder="Buscar por folio, título o categoría" :total="query.data.value ? rows.length : null" />
      <QueryState
        :data="query.data.value?.items" :is-pending="query.isPending.value" :error="query.error.value" subject="los casos" empty-icon="folder"
        empty-title="Aún no hay casos" empty-description="Cuando se registre un caso al que usted tenga acceso, aparecerá en esta lista." @retry="query.refetch()"
      >
        <template #default>
          <AppTable :rows="rows" :columns="columns" label="Casos" :row-to="rowTo" :detail-label="(c) => `Abrir ${formatFolio(c.folio)}`" :page-size="12">
            <template #cell-folio="{ row }"><span class="whitespace-nowrap tabular-nums">{{ formatFolio(row.folio) }}</span></template>
            <template #cell-title="{ row }"><span class="block max-w-xs truncate font-medium text-slate-900 lg:max-w-md" :title="row.title">{{ row.title }}</span></template>
            <template #cell-categoryCode="{ row }">{{ categoryLabel(row.categoryCode) }}</template>
            <template #cell-priority="{ row }"><PriorityBadge :priority="row.priority" /></template>
            <template #cell-status="{ row }"><StatusBadge :status="row.status" /></template>
            <template #cell-responsibleUserId="{ row }"><span :class="row.responsibleUserId ? '' : 'text-slate-500'">{{ nameOf(row.responsibleUserId) }}</span></template>
            <template #cell-nextActionDueAt="{ row }">
              <span v-if="row.nextActionDueAt" :class="['whitespace-nowrap tabular-nums', isActiveCase(row) && isOverdue(row.nextActionDueAt) ? 'font-semibold text-red-800' : 'text-slate-700']">
                {{ formatDate(row.nextActionDueAt) }}<span v-if="isActiveCase(row) && isOverdue(row.nextActionDueAt)" class="sr-only"> (vencida)</span>
              </span>
              <span v-else class="text-slate-500">—</span>
            </template>
            <template #cell-updatedAt="{ row }"><span class="whitespace-nowrap tabular-nums text-slate-700">{{ formatDateTime(row.updatedAt) }}</span></template>
            <template #empty>
              <div class="px-6 py-10 text-center"><p class="font-semibold text-slate-900">Sin coincidencias</p><p class="mt-1 text-sm text-slate-600">Ajuste la búsqueda o limpie los filtros para ver más casos.</p></div>
            </template>
          </AppTable>
        </template>
      </QueryState>
    </section>
    <p v-if="query.data.value?.truncated" class="mt-3 text-xs text-slate-500">Se muestran los {{ query.data.value.items.length }} casos más recientes de {{ query.data.value.total }}.</p>
  </div>
</template>
