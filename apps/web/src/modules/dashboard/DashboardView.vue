<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import AppIcon from '@/components/AppIcon.vue';
import BarChart from '@/components/BarChart.vue';
import ErrorState from '@/components/ErrorState.vue';
import PageHeader from '@/components/PageHeader.vue';
import PreviewBadge from '@/components/PreviewBadge.vue';
import PriorityBadge from '@/components/PriorityBadge.vue';
import QueryState from '@/components/QueryState.vue';
import SectionCard from '@/components/SectionCard.vue';
import StatCard from '@/components/StatCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import Timeline from '@/components/Timeline.vue';
import { useResource } from '@/composables/useResource';
import { formatDate, formatDateTime, formatLongDate } from '@/lib/format';
import { PRIORITIES } from '@/lib/status';
import type { DashboardData } from '@/types/models';

const dashboard = useResource('dashboard');
const cases = useResource('cases');
const tasks = useResource('tasks');
const calendar = useResource('calendar');

const stats = computed(() => dashboard.data.value?.stats ?? null);
const STAT_CARDS: { key: keyof DashboardData['stats']; label: string; icon: string; to: string; emphasis?: 'danger' | 'warning' }[] = [
  { key: 'activeCases', label: 'Casos activos', icon: 'folder', to: '/casos' },
  { key: 'newCases', label: 'Casos nuevos', icon: 'plus', to: '/casos' },
  { key: 'criticalCases', label: 'Casos críticos', icon: 'alert-circle', to: '/casos', emphasis: 'danger' },
  { key: 'closedCases', label: 'Casos cerrados', icon: 'check-circle', to: '/casos/cerrados' },
  { key: 'activeProtocols', label: 'Protocolos activos', icon: 'list-checks', to: '/protocolos' },
  { key: 'pendingMeasures', label: 'Medidas pendientes', icon: 'shield', to: '/medidas', emphasis: 'warning' },
  { key: 'overdueTasks', label: 'Tareas vencidas', icon: 'clock', to: '/tareas', emphasis: 'danger' },
  { key: 'upcomingInterviews', label: 'Entrevistas próximas', icon: 'message', to: '/entrevistas' }
];

const attention = computed(() => (cases.data.value ?? []).filter((c) => PRIORITIES[c.priority].rank >= 3).slice(0, 5));
const priorityTasks = computed(() => (tasks.data.value ?? []).filter((t) => t.status !== 'completada').sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5));
const upcoming = computed(() => {
  const now = new Date().toISOString();
  return (calendar.data.value ?? []).filter((e) => e.start >= now).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 5);
});
const alertIcon = { danger: 'alert-circle', warning: 'alert-triangle', info: 'info' } as const;
const alertClass = { danger: 'text-red-700', warning: 'text-amber-700', info: 'text-sky-700' } as const;
</script>

<template>
  <div>
    <PageHeader title="Panel de inicio" :description="`${formatLongDate(new Date())}. Resumen de la convivencia escolar del establecimiento.`">
      <template #badges><PreviewBadge /></template>
    </PageHeader>

    <section aria-labelledby="indicadores">
      <h2 id="indicadores" class="sr-only">Indicadores</h2>
      <div v-if="dashboard.error.value" class="mb-4 rounded-xl border border-slate-200 bg-white">
        <ErrorState :error="dashboard.error.value" compact subject="los indicadores del establecimiento" @retry="dashboard.refetch()" />
      </div>
      <div class="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatCard
          v-for="card in STAT_CARDS" :key="card.key" :label="card.label" :icon="card.icon" :to="card.to" :emphasis="card.emphasis"
          :value="stats ? stats[card.key] : null" :hint="dashboard.isPending.value ? 'Cargando…' : stats ? undefined : 'Sin datos disponibles'"
        />
      </div>
    </section>

    <div class="mt-4 grid gap-4 xl:grid-cols-3">
      <SectionCard dense title="Evolución de casos" description="Casos ingresados por mes, últimos seis meses." class="xl:col-span-2">
        <QueryState :data="dashboard.data.value" :is-pending="dashboard.isPending.value" :error="dashboard.error.value" compact :rows="3" subject="la evolución de casos" @retry="dashboard.refetch()">
          <template #default="{ data }"><BarChart :data="data.trend" title="Casos ingresados" height-class="h-32" /></template>
        </QueryState>
      </SectionCard>

      <SectionCard dense title="Alertas" flush>
        <QueryState
          :data="dashboard.data.value?.alerts" :is-pending="dashboard.isPending.value" :error="dashboard.error.value" compact :rows="3"
          empty-title="Sin alertas" empty-icon="check-circle" subject="las alertas" @retry="dashboard.refetch()"
        >
          <template #default="{ data }">
            <ul class="divide-y divide-slate-100">
              <li v-for="a in data" :key="a.id" class="flex gap-3 px-4 py-2.5 text-sm text-slate-700">
                <AppIcon :name="alertIcon[a.tone]" :size="17" :class="['mt-0.5', alertClass[a.tone]]" :label="a.tone === 'danger' ? 'Urgente' : a.tone === 'warning' ? 'Advertencia' : 'Información'" />
                <span>{{ a.text }}</span>
              </li>
            </ul>
          </template>
        </QueryState>
      </SectionCard>
    </div>

    <div class="mt-4 grid gap-4 lg:grid-cols-2">
      <SectionCard dense title="Casos que requieren atención" description="Prioridad alta o crítica." flush>
        <template #actions><RouterLink to="/casos" class="rounded text-sm font-medium text-sky-700 hover:underline">Ver casos</RouterLink></template>
        <QueryState :data="attention" :is-pending="cases.isPending.value" :error="cases.error.value" compact :rows="3" empty-title="Sin casos prioritarios" empty-icon="check-circle" subject="los casos" @retry="cases.refetch()">
          <template #default="{ data }">
            <ul class="divide-y divide-slate-100">
              <li v-for="c in data" :key="c.id">
                <RouterLink :to="{ name: 'cases-detail', params: { id: c.id } }" class="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 hover:bg-slate-50">
                  <span class="w-28 text-sm font-medium tabular-nums text-sky-800">{{ c.folio }}</span>
                  <span class="min-w-0 flex-1 truncate text-sm text-slate-700">{{ c.type }}, {{ c.course }}</span>
                  <PriorityBadge :priority="c.priority" />
                </RouterLink>
              </li>
            </ul>
          </template>
        </QueryState>
      </SectionCard>

      <SectionCard dense title="Tareas prioritarias" description="Pendientes ordenadas por vencimiento." flush>
        <template #actions><RouterLink to="/tareas" class="rounded text-sm font-medium text-sky-700 hover:underline">Ver tareas</RouterLink></template>
        <QueryState :data="priorityTasks" :is-pending="tasks.isPending.value" :error="tasks.error.value" compact :rows="3" empty-title="Sin tareas pendientes" empty-icon="check-circle" subject="las tareas" @retry="tasks.refetch()">
          <template #default="{ data }">
            <ul class="divide-y divide-slate-100">
              <li v-for="t in data" :key="t.id">
                <RouterLink :to="{ name: 'tasks-detail', params: { id: t.id } }" class="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 hover:bg-slate-50">
                  <span class="basis-full break-words text-sm text-slate-800 sm:min-w-0 sm:flex-1 sm:basis-0">{{ t.title }}</span>
                  <span class="text-xs tabular-nums text-slate-500">Vence {{ formatDate(t.dueDate) }}</span>
                  <StatusBadge :status="t.status" />
                </RouterLink>
              </li>
            </ul>
          </template>
        </QueryState>
      </SectionCard>

      <SectionCard dense title="Actividad reciente">
        <QueryState :data="dashboard.data.value?.activity" :is-pending="dashboard.isPending.value" :error="dashboard.error.value" compact :rows="3" empty-title="Sin actividad registrada" subject="la actividad" @retry="dashboard.refetch()">
          <template #default="{ data }"><Timeline :entries="data.map((a) => ({ id: a.id, title: a.text, at: a.at, tone: 'info' as const }))" /></template>
        </QueryState>
      </SectionCard>

      <SectionCard dense title="Próximas actividades" flush>
        <template #actions><RouterLink to="/calendario" class="rounded text-sm font-medium text-sky-700 hover:underline">Ver calendario</RouterLink></template>
        <QueryState :data="upcoming" :is-pending="calendar.isPending.value" :error="calendar.error.value" compact :rows="3" empty-title="Sin actividades programadas" empty-icon="calendar" subject="el calendario" @retry="calendar.refetch()">
          <template #default="{ data }">
            <ul class="divide-y divide-slate-100">
              <li v-for="e in data" :key="e.id" class="flex items-center gap-4 px-4 py-2">
                <time :datetime="e.start" class="w-32 shrink-0 text-xs tabular-nums text-slate-500">{{ formatDateTime(e.start) }}</time>
                <span class="min-w-0 flex-1 truncate text-sm text-slate-800">{{ e.title }}</span>
                <span class="hidden text-xs text-slate-500 sm:inline">{{ e.place }}</span>
              </li>
            </ul>
          </template>
        </QueryState>
      </SectionCard>
    </div>
  </div>
</template>
