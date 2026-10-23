<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import SelectButton from 'primevue/selectbutton';
import PriorityBadge from '@/components/PriorityBadge.vue';
import QueryState from '@/components/QueryState.vue';
import ResourceListPage from '@/components/ResourceListPage.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { useResource } from '@/composables/useResource';
import { formatDate } from '@/lib/format';
import { statusOf } from '@/lib/status';
import { TASK_STATUSES, taskColumns, taskFilters } from './tasks.config';

/** Tareas en lista (tabla filtrable) o tablero por estado. El tablero es de lectura: mover tarjetas requiere API. */
const VIEWS = [{ label: 'Lista', value: 'list' }, { label: 'Tablero', value: 'board' }];
const view = ref<'list' | 'board'>('list');
const query = useResource('tasks');
const columns = computed(() => TASK_STATUSES.map((status) => ({ status, items: (query.data.value ?? []).filter((t) => t.status === status) })));
</script>

<template>
  <ResourceListPage
    resource="tasks" title="Tareas" description="Tareas del equipo de convivencia, asociadas o no a un caso." :columns="taskColumns" :filters="taskFilters"
    :search-fields="['title', 'caseFolio', 'responsible']" search-placeholder="Buscar tarea, caso o responsable" detail-route="tasks-detail"
    :create="{ to: { name: 'tasks-new' }, label: 'Nueva tarea' }" subject="las tareas" empty-icon="check-square" empty-title="No hay tareas registradas" :hide-table="view === 'board'"
  >
    <template #actions><SelectButton v-model="view" :options="VIEWS" option-label="label" option-value="value" :allow-empty="false" aria-label="Vista de tareas" /></template>
    <template v-if="view === 'board'" #before>
      <QueryState :data="query.data.value" :is-pending="query.isPending.value" :error="query.error.value" subject="las tareas" empty-title="No hay tareas" @retry="query.refetch()">
        <div class="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <section v-for="col in columns" :key="col.status" class="rounded-xl border border-slate-200 bg-slate-100/60 p-3" :aria-labelledby="`col-${col.status}`">
            <h2 :id="`col-${col.status}`" class="mb-3 flex items-center justify-between px-1 text-sm font-semibold text-slate-700">
              {{ statusOf(col.status).label }}<span class="rounded bg-white px-1.5 text-xs tabular-nums text-slate-600">{{ col.items.length }}</span>
            </h2>
            <ul class="space-y-2">
              <li v-for="t in col.items" :key="t.id">
                <RouterLink :to="{ name: 'tasks-detail', params: { id: t.id } }" class="block rounded-lg border border-slate-200 bg-white p-3 hover:border-slate-300">
                  <p class="text-sm font-medium text-slate-900">{{ t.title }}</p>
                  <p class="mt-1 text-xs tabular-nums text-slate-500">{{ t.caseFolio ?? 'Sin caso' }}, vence {{ formatDate(t.dueDate) }}</p>
                  <div class="mt-2.5 flex items-center justify-between"><PriorityBadge :priority="t.priority" /><StatusBadge v-if="t.status === 'vencida'" status="vencida" /></div>
                </RouterLink>
              </li>
              <li v-if="!col.items.length" class="px-1 py-4 text-center text-xs text-slate-500">Sin tareas</li>
            </ul>
          </section>
        </div>
      </QueryState>
    </template>
  </ResourceListPage>
</template>
