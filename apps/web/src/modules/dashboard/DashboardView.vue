<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import AppIcon from '@/components/AppIcon.vue';
import BarChart from '@/components/BarChart.vue';
import EmptyState from '@/components/EmptyState.vue';
import ErrorState from '@/components/ErrorState.vue';
import PageHeader from '@/components/PageHeader.vue';
import PriorityBadge from '@/components/PriorityBadge.vue';
import QueryState from '@/components/QueryState.vue';
import SectionCard from '@/components/SectionCard.vue';
import StatCard from '@/components/StatCard.vue';
import Timeline from '@/components/Timeline.vue';
import { useNotifications } from '@/composables/useNotifications';
import { useSession } from '@/composables/useSession';
import { useScopedInterviews, useScopedMeasures, useScopedTasks } from '@/composables/useScoped';
import { useAllCases } from '@/composables/useCases';
import { categoryLabel, formatFolio } from '@/lib/catalogs';
import { isForbidden } from '@/lib/errors';
import { formatDate, formatDateTime, formatLongDate } from '@/lib/format';
import { casesByMonth, collectDeadlines, computeCaseMetrics, isOverdueMeasure, isOverdueTask, isPendingMeasure, isPendingTask } from '@/lib/metrics';
import { statusOf } from '@/lib/status';
import type { CaseRecord } from '@/types/api';

/**
 * Panel de inicio con indicadores reales. Los datos de expedientes salen de `GET /cases`; tareas, medidas y entrevistas se
 * componen consultando los expedientes más recientes (la API no ofrece listados globales ni estadísticas). Cada tarjeta
 * indica su base cuando no cubre todos los expedientes. Las entrevistas "programadas" no existen en el modelo de la API:
 * solo hay entrevistas realizadas (borrador o finalizadas), por eso se informa cuántas están en borrador.
 */
const { can } = useSession();
const canCases = computed(() => can('cases.read'));
/** El rol debería poder leer expedientes (según la matriz inicial), pero el servidor lo negó: faltan permisos aplicados en el sistema. */
const serverDenied = computed(() => canCases.value && isForbidden(cases.error.value));
const cases = useAllCases(canCases);
const tasks = useScopedTasks({ enabled: () => canCases.value && can('tasks.read') });
const measures = useScopedMeasures({ enabled: () => canCases.value && can('measures.read') });
const interviews = useScopedInterviews({ enabled: () => canCases.value && can('interviews.read') });
const { unreadCount } = useNotifications();

const now = new Date();
const metrics = computed(() => (cases.data.value ? computeCaseMetrics(cases.data.value.items, now) : null));
const scopeNote = (truncated?: boolean, scanned?: number) => (truncated ? `En los ${scanned} expedientes abiertos más recientes` : undefined);

const stats = computed(() => {
  const m = metrics.value;
  const taskRows = tasks.data.value?.rows ?? [];
  const measureRows = measures.data.value?.rows ?? [];
  const interviewRows = interviews.data.value?.rows ?? [];
  return [
    { label: 'Casos activos', icon: 'folder', value: m ? m.active.length : null, hint: 'No cerrados', to: '/casos' },
    { label: 'Casos nuevos', icon: 'plus', value: m ? m.recentlyReceived : null, hint: 'Recibidos en 30 días', to: '/casos' },
    { label: 'Casos críticos', icon: 'alert-circle', value: m ? m.critical.length : null, hint: 'Activos de prioridad crítica', to: { path: '/casos', query: { prioridad: 'CRITICA' } }, emphasis: 'danger' as const },
    { label: 'Casos cerrados', icon: 'check-circle', value: m ? m.closed : null, to: { path: '/casos', query: { estado: 'CERRADO' } } },
    { label: 'Medidas pendientes', icon: 'shield', value: measures.data.value ? measureRows.filter((row) => isPendingMeasure(row.item)).length : null, hint: scopeNote(measures.data.value?.truncated, measures.data.value?.scanned), to: '/medidas', emphasis: 'warning' as const },
    { label: 'Tareas vencidas', icon: 'clock', value: tasks.data.value ? taskRows.filter((row) => isOverdueTask(row.item, now)).length : null, hint: scopeNote(tasks.data.value?.truncated, tasks.data.value?.scanned), to: '/tareas', emphasis: 'danger' as const },
    { label: 'Entrevistas en borrador', icon: 'message', value: interviews.data.value ? interviewRows.filter((row) => row.item.status === 'BORRADOR').length : null, hint: scopeNote(interviews.data.value?.truncated, interviews.data.value?.scanned), to: '/entrevistas' },
    { label: 'Acciones vencidas', icon: 'calendar', value: m ? m.overdueActions.length : null, hint: 'Próxima acción con plazo cumplido', to: '/calendario', emphasis: 'warning' as const }
  ];
});

const statusChart = computed(() => (metrics.value ? Object.entries(metrics.value.byStatus).map(([code, value]) => ({ label: statusOf(code).label, value })) : []));
const monthChart = computed(() => (cases.data.value ? casesByMonth(cases.data.value.items, now) : []));

const alerts = computed(() => {
  const list: { id: string; tone: 'danger' | 'warning' | 'info'; text: string; to: string }[] = [];
  const m = metrics.value;
  const overdueTasks = (tasks.data.value?.rows ?? []).filter((row) => isOverdueTask(row.item, now)).length;
  const overdueMeasures = (measures.data.value?.rows ?? []).filter((row) => isOverdueMeasure(row.item, now)).length;
  const drafts = (interviews.data.value?.rows ?? []).filter((row) => row.item.status === 'BORRADOR').length;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  if (m?.critical.length) list.push({ id: 'critical', tone: 'danger', text: `${plural(m.critical.length, 'caso crítico activo', 'casos críticos activos')}.`, to: '/casos?prioridad=CRITICA' });
  if (overdueTasks) list.push({ id: 'tasks', tone: 'danger', text: `${plural(overdueTasks, 'tarea vencida', 'tareas vencidas')}.`, to: '/tareas' });
  if (overdueMeasures) list.push({ id: 'measures', tone: 'warning', text: `${plural(overdueMeasures, 'medida de resguardo con plazo vencido', 'medidas de resguardo con plazo vencido')}.`, to: '/medidas' });
  if (m?.overdueActions.length) list.push({ id: 'actions', tone: 'warning', text: `${plural(m.overdueActions.length, 'expediente con la próxima acción vencida', 'expedientes con la próxima acción vencida')}.`, to: '/calendario' });
  if (drafts) list.push({ id: 'drafts', tone: 'info', text: `${plural(drafts, 'entrevista sin finalizar', 'entrevistas sin finalizar')}.`, to: '/entrevistas' });
  if (unreadCount.value) list.push({ id: 'notifications', tone: 'info', text: `${plural(unreadCount.value, 'notificación sin leer', 'notificaciones sin leer')}.`, to: '/notificaciones' });
  return list;
});
const alertIcon = { danger: 'alert-circle', warning: 'alert-triangle', info: 'info' } as const;
const alertClass = { danger: 'text-red-700', warning: 'text-amber-700', info: 'text-sky-700' } as const;

const priorityTasks = computed(() => (tasks.data.value?.rows ?? []).filter((row) => isPendingTask(row.item))
  .sort((a, b) => (a.item.dueAt ?? '9999').localeCompare(b.item.dueAt ?? '9999')).slice(0, 5));
const upcoming = computed(() => collectDeadlines({
  cases: cases.data.value?.items ?? [],
  tasks: (tasks.data.value?.rows ?? []).map((row) => ({ caseId: row.case.id, item: row.item })),
  measures: (measures.data.value?.rows ?? []).map((row) => ({ caseId: row.case.id, item: row.item })),
  followUps: []
}, now).filter((deadline) => !deadline.overdue).slice(0, 6));
const caseOf = (id: string): CaseRecord | undefined => cases.data.value?.items.find((record) => record.id === id);
const activity = computed(() => (metrics.value?.recent ?? []).map((record) => ({
  id: record.id, title: `${formatFolio(record.folio)} · ${record.title}`, at: record.updatedAt, tone: 'info' as const, meta: statusOf(record.status).label
})));
</script>

<template>
  <div>
    <PageHeader title="Panel de inicio" :description="`${formatLongDate(new Date())}. Resumen de la convivencia escolar a partir de los expedientes a los que usted tiene acceso.`" />

    <div v-if="!canCases || serverDenied" class="rounded-xl border border-slate-200 bg-white">
      <EmptyState v-if="!canCases" icon="lock" title="Su rol no incluye acceso a expedientes" description="Los indicadores se calculan con los expedientes autorizados. Use el menú para acceder a las secciones habilitadas para su perfil." />
      <EmptyState v-else icon="lock" title="El servidor no concede acceso a expedientes a su cuenta" description="Su rol debería poder verlos, pero los permisos de expedientes aún no están aplicados en el sistema. Quien administre la base de datos debe aplicar los permisos iniciales de los roles (comando roles:seed); mientras tanto puede usar las secciones de Administración." />
    </div>

    <template v-else>
      <section aria-labelledby="indicadores">
        <h2 id="indicadores" class="sr-only">Indicadores</h2>
        <div v-if="cases.error.value" class="mb-4 rounded-xl border border-slate-200 bg-white">
          <ErrorState :error="cases.error.value" compact subject="los indicadores" @retry="cases.refetch()" />
        </div>
        <div class="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <StatCard
            v-for="card in stats" :key="card.label" :label="card.label" :icon="card.icon" :to="card.to" :emphasis="card.emphasis" :value="card.value"
            :hint="cases.isPending.value && card.value === null ? 'Cargando…' : card.hint"
          />
        </div>
        <p v-if="cases.data.value?.truncated" class="mt-2 text-xs text-slate-500">Se muestran los {{ cases.data.value.items.length }} expedientes más recientes de {{ cases.data.value.total }}.</p>
      </section>

      <div class="mt-4 grid gap-4 xl:grid-cols-3">
        <SectionCard dense title="Casos por estado" description="Todos los expedientes autorizados." class="xl:col-span-1">
          <QueryState :data="cases.data.value ? statusChart : undefined" :is-pending="cases.isPending.value" :error="cases.error.value" compact :rows="3" empty-title="Aún no hay expedientes" empty-icon="folder" subject="los casos" @retry="cases.refetch()">
            <template #default="{ data }"><BarChart :data="data" title="Expedientes por estado" horizontal /></template>
          </QueryState>
        </SectionCard>
        <SectionCard dense title="Casos recibidos por mes" description="Últimos seis meses, según la fecha de recepción." class="xl:col-span-1">
          <QueryState :data="cases.data.value ? monthChart : undefined" :is-pending="cases.isPending.value" :error="cases.error.value" compact :rows="3" :is-empty="() => false" subject="la evolución" @retry="cases.refetch()">
            <template #default="{ data }"><BarChart :data="data" title="Expedientes recibidos" height-class="h-32" /></template>
          </QueryState>
        </SectionCard>
        <SectionCard dense title="Alertas" flush>
          <QueryState :data="cases.data.value ? alerts : undefined" :is-pending="cases.isPending.value" :error="cases.error.value" compact :rows="3" empty-title="Sin alertas por ahora" empty-icon="check-circle" subject="las alertas" @retry="cases.refetch()">
            <template #default="{ data }">
              <ul class="divide-y divide-slate-100">
                <li v-for="a in data" :key="a.id">
                  <RouterLink :to="a.to" class="flex gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                    <AppIcon :name="alertIcon[a.tone]" :size="17" :class="['mt-0.5', alertClass[a.tone]]" :label="a.tone === 'danger' ? 'Urgente' : a.tone === 'warning' ? 'Advertencia' : 'Información'" />
                    <span>{{ a.text }}</span>
                  </RouterLink>
                </li>
              </ul>
            </template>
          </QueryState>
        </SectionCard>
      </div>

      <div class="mt-4 grid gap-4 lg:grid-cols-2">
        <SectionCard dense title="Casos que requieren atención" description="Prioridad alta o crítica, o con la próxima acción vencida." flush>
          <template #actions><RouterLink to="/casos" class="rounded text-sm font-medium text-sky-700 hover:underline">Ver casos</RouterLink></template>
          <QueryState :data="metrics ? metrics.attention.slice(0, 5) : undefined" :is-pending="cases.isPending.value" :error="cases.error.value" compact :rows="3" empty-title="Ningún caso requiere atención" empty-icon="check-circle" subject="los casos" @retry="cases.refetch()">
            <template #default="{ data }">
              <ul class="divide-y divide-slate-100">
                <li v-for="record in data" :key="record.id">
                  <RouterLink :to="{ name: 'cases-detail', params: { id: record.id } }" class="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 hover:bg-slate-50">
                    <span class="w-20 text-sm font-medium tabular-nums text-sky-800">{{ formatFolio(record.folio) }}</span>
                    <span class="min-w-0 flex-1 truncate text-sm text-slate-700">{{ record.title }} <span class="text-slate-500">· {{ categoryLabel(record.categoryCode) }}</span></span>
                    <PriorityBadge :priority="record.priority" />
                  </RouterLink>
                </li>
              </ul>
            </template>
          </QueryState>
        </SectionCard>

        <SectionCard dense title="Tareas prioritarias" description="Pendientes ordenadas por vencimiento." flush>
          <template #actions><RouterLink to="/tareas" class="rounded text-sm font-medium text-sky-700 hover:underline">Ver tareas</RouterLink></template>
          <p v-if="!can('tasks.read')" class="px-4 py-6 text-center text-sm text-slate-600">Su rol no incluye el acceso a tareas.</p>
          <QueryState v-else :data="tasks.data.value ? priorityTasks : undefined" :is-pending="tasks.isPending.value" :error="tasks.error.value" compact :rows="3" empty-title="Sin tareas pendientes" empty-icon="check-circle" subject="las tareas" @retry="tasks.refetch()">
            <template #default="{ data }">
              <ul class="divide-y divide-slate-100">
                <li v-for="row in data" :key="row.item.id">
                  <RouterLink :to="{ name: 'cases-detail', params: { id: row.case.id }, query: { tab: 'tareas' } }" class="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 hover:bg-slate-50">
                    <span class="basis-full break-words text-sm text-slate-800 sm:min-w-0 sm:flex-1 sm:basis-0">{{ row.item.title }}</span>
                    <span :class="['text-xs tabular-nums', isOverdueTask(row.item, now) ? 'font-semibold text-red-800' : 'text-slate-500']">{{ row.item.dueAt ? `${isOverdueTask(row.item, now) ? 'Vencida el' : 'Vence'} ${formatDate(row.item.dueAt)}` : 'Sin fecha' }}</span>
                  </RouterLink>
                </li>
              </ul>
            </template>
          </QueryState>
        </SectionCard>

        <SectionCard dense title="Actividad reciente" description="Expedientes con cambios más recientes.">
          <QueryState :data="cases.data.value ? activity : undefined" :is-pending="cases.isPending.value" :error="cases.error.value" compact :rows="3" empty-title="Sin actividad registrada" subject="la actividad" @retry="cases.refetch()">
            <template #default="{ data }"><Timeline :entries="data" /></template>
          </QueryState>
        </SectionCard>

        <SectionCard dense title="Próximas actividades" description="Plazos de tareas, medidas y próximas acciones." flush>
          <template #actions><RouterLink to="/calendario" class="rounded text-sm font-medium text-sky-700 hover:underline">Ver calendario</RouterLink></template>
          <QueryState :data="cases.data.value ? upcoming : undefined" :is-pending="cases.isPending.value" :error="cases.error.value" compact :rows="3" empty-title="Sin plazos próximos" empty-icon="calendar" subject="los plazos" @retry="cases.refetch()">
            <template #default="{ data }">
              <ul class="divide-y divide-slate-100">
                <li v-for="d in data" :key="d.id">
                  <RouterLink :to="{ name: 'cases-detail', params: { id: d.caseId } }" class="flex items-center gap-4 px-4 py-2 hover:bg-slate-50">
                    <time :datetime="d.at" class="w-32 shrink-0 text-xs tabular-nums text-slate-500">{{ formatDateTime(d.at) }}</time>
                    <span class="min-w-0 flex-1 truncate text-sm text-slate-800">{{ d.title }}</span>
                    <span class="hidden text-xs tabular-nums text-slate-500 sm:inline">{{ caseOf(d.caseId) ? formatFolio(caseOf(d.caseId)!.folio) : '' }}</span>
                  </RouterLink>
                </li>
              </ul>
            </template>
          </QueryState>
        </SectionCard>
      </div>
    </template>
  </div>
</template>
