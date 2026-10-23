<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import SelectButton from 'primevue/selectbutton';
import AppIcon from '@/components/AppIcon.vue';
import ErrorState from '@/components/ErrorState.vue';
import LoadingState from '@/components/LoadingState.vue';
import PageHeader from '@/components/PageHeader.vue';
import ScopeNotice from '@/components/ScopeNotice.vue';
import { useAllCases } from '@/composables/useCases';
import { useScopedFollowUps, useScopedMeasures, useScopedTasks } from '@/composables/useScoped';
import { useSession } from '@/composables/useSession';
import { formatFolio } from '@/lib/catalogs';
import { formatDateTime, formatTime } from '@/lib/format';
import { collectDeadlines, type Deadline, type DeadlineKind } from '@/lib/metrics';

/**
 * Calendario de plazos. La API no tiene agenda ni eventos: se muestran los plazos reales de tareas y medidas pendientes, la próxima
 * acción de cada expediente abierto y la de los seguimientos. Cada plazo abre su expediente. Mes, semana y agenda móvil.
 */
const { can } = useSession();
const cases = useAllCases();
const tasks = useScopedTasks({ enabled: () => can('tasks.read') });
const measures = useScopedMeasures({ enabled: () => can('measures.read') });
const followUps = useScopedFollowUps({ enabled: () => can('follow-ups.read') });
const view = ref<'month' | 'week'>('month');
const cursor = ref(new Date());
const selected = ref<Deadline | null>(null);

const KIND: Record<DeadlineKind, { label: string; cls: string }> = {
  'next-action': { label: 'Próxima acción del expediente', cls: 'border-l-sky-600 bg-sky-50 text-sky-900' },
  task: { label: 'Tarea', cls: 'border-l-slate-500 bg-slate-100 text-slate-800' },
  measure: { label: 'Medida de resguardo', cls: 'border-l-amber-500 bg-amber-50 text-amber-900' },
  'follow-up': { label: 'Próxima acción de seguimiento', cls: 'border-l-emerald-600 bg-emerald-50 text-emerald-900' }
};
const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const deadlines = computed(() => collectDeadlines({
  cases: cases.data.value?.items ?? [],
  tasks: (tasks.data.value?.rows ?? []).map((r) => ({ caseId: r.case.id, item: r.item })),
  measures: (measures.data.value?.rows ?? []).map((r) => ({ caseId: r.case.id, item: r.item })),
  followUps: (followUps.data.value?.rows ?? []).map((r) => ({ caseId: r.case.id, item: r.item }))
}));
const folioOf = (id: string) => { const c = cases.data.value?.items.find((x) => x.id === id); return c ? formatFolio(c.folio) : 'Expediente'; };

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const startOfWeek = (d: Date) => { const r = new Date(d); r.setHours(0, 0, 0, 0); r.setDate(r.getDate() - ((r.getDay() + 6) % 7)); return r; };
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const days = computed(() => {
  if (view.value === 'week') return Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor.value), i));
  const start = startOfWeek(new Date(cursor.value.getFullYear(), cursor.value.getMonth(), 1));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
});
const byDay = computed(() => {
  const map = new Map<string, Deadline[]>();
  for (const d of deadlines.value) { const key = dayKey(new Date(d.at)); map.set(key, [...(map.get(key) ?? []), d]); }
  return map;
});
const title = computed(() => {
  if (view.value === 'month') { const text = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' }).format(cursor.value); return text.charAt(0).toUpperCase() + text.slice(1); }
  const s = startOfWeek(cursor.value); const e = addDays(s, 6);
  return `Semana del ${s.getDate()} al ${e.getDate()} de ${new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(e)}`;
});
const todayKey = dayKey(new Date());
function move(step: number) { const d = new Date(cursor.value); if (view.value === 'month') d.setMonth(d.getMonth() + step, 1); else d.setDate(d.getDate() + step * 7); cursor.value = d; }
const dayLabel = (d: Date) => new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
const pending = computed(() => cases.isPending.value);
const dialog = computed({ get: () => Boolean(selected.value), set: (v: boolean) => { if (!v) selected.value = null; } });
</script>

<template>
  <div>
    <PageHeader title="Calendario" description="Plazos de tareas, medidas y próximas acciones de los expedientes a los que usted tiene acceso.">
      <template #actions><SelectButton v-model="view" :options="[{ label: 'Mes', value: 'month' }, { label: 'Semana', value: 'week' }]" option-label="label" option-value="value" :allow-empty="false" aria-label="Vista del calendario" /></template>
    </PageHeader>
    <ScopeNotice v-if="tasks.data.value" :result="tasks.data.value" noun="Plazos de tareas y medidas" />

    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-labelledby="cal-title">
      <header class="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3">
        <div class="flex items-center gap-1">
          <Button text rounded severity="secondary" aria-label="Período anterior" @click="move(-1)"><template #icon><AppIcon name="chevron-left" :size="18" /></template></Button>
          <Button text rounded severity="secondary" aria-label="Período siguiente" @click="move(1)"><template #icon><AppIcon name="chevron-right" :size="18" /></template></Button>
        </div>
        <h2 id="cal-title" class="text-base font-semibold text-slate-900" aria-live="polite">{{ title }}</h2>
        <Button label="Hoy" size="small" outlined severity="secondary" class="ml-auto" @click="cursor = new Date()" />
      </header>

      <LoadingState v-if="pending" :rows="6" />
      <ErrorState v-else-if="cases.error.value" :error="cases.error.value" subject="el calendario" @retry="cases.refetch()" />
      <template v-else>
        <div v-if="view === 'month'" class="hidden md:block">
          <div class="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600"><div v-for="d in WEEKDAYS" :key="d" class="px-2 py-2">{{ d }}</div></div>
          <div class="grid grid-cols-7">
            <div v-for="d in days" :key="dayKey(d)" :class="['min-h-24 border-b border-r border-slate-100 p-1.5 [&:nth-child(7n)]:border-r-0', d.getMonth() === cursor.getMonth() ? '' : 'bg-slate-50/70']">
              <p :class="['mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs tabular-nums', dayKey(d) === todayKey ? 'bg-sky-700 font-semibold text-white' : d.getMonth() === cursor.getMonth() ? 'text-slate-700' : 'text-slate-400']">{{ d.getDate() }}</p>
              <ul class="space-y-1">
                <li v-for="e in (byDay.get(dayKey(d)) ?? []).slice(0, 3)" :key="e.id">
                  <button type="button" :class="['block w-full truncate rounded border-l-2 px-1.5 py-0.5 text-left text-[11px] leading-snug', KIND[e.kind].cls, e.overdue ? 'ring-1 ring-red-300' : '']" @click="selected = e">{{ e.title }}</button>
                </li>
                <li v-if="(byDay.get(dayKey(d)) ?? []).length > 3" class="px-1.5 text-[11px] text-slate-500">y {{ (byDay.get(dayKey(d)) ?? []).length - 3 }} más</li>
              </ul>
            </div>
          </div>
        </div>

        <ol :class="['divide-y divide-slate-100', view === 'month' ? 'md:hidden' : '']">
          <template v-for="d in days" :key="`a-${dayKey(d)}`">
            <li v-if="view === 'week' || (d.getMonth() === cursor.getMonth() && byDay.get(dayKey(d)))" class="flex gap-4 px-4 py-3">
              <p :class="['w-28 shrink-0 text-sm first-letter:uppercase', dayKey(d) === todayKey ? 'font-semibold text-sky-800' : 'text-slate-600']">{{ dayLabel(d) }}</p>
              <ul v-if="byDay.get(dayKey(d))" class="min-w-0 flex-1 space-y-1.5">
                <li v-for="e in byDay.get(dayKey(d))" :key="e.id">
                  <button type="button" :class="['flex w-full gap-2 rounded border-l-2 px-2.5 py-1.5 text-left text-sm', KIND[e.kind].cls]" @click="selected = e"><span class="truncate">{{ e.title }}</span><span v-if="e.overdue" class="shrink-0 text-xs font-semibold text-red-800">Vencido</span></button>
                </li>
              </ul>
              <p v-else class="text-sm text-slate-400">Sin plazos</p>
            </li>
          </template>
        </ol>
        <p v-if="!deadlines.length" class="border-t border-slate-100 px-4 py-6 text-center text-sm text-slate-600">No hay plazos con fecha en los expedientes revisados.</p>
      </template>

      <footer class="flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-200 px-4 py-3 text-xs text-slate-600">
        <span v-for="(k, key) in KIND" :key="key" class="flex items-center gap-1.5"><span :class="['h-3 w-1 rounded-sm border-l-2', k.cls]" />{{ k.label }}</span>
      </footer>
    </section>

    <Dialog v-model:visible="dialog" :header="selected?.title" modal :draggable="false" :style="{ width: '28rem' }" :breakpoints="{ '640px': 'calc(100vw - 2rem)' }">
      <dl v-if="selected" class="space-y-3 text-sm">
        <div><dt class="text-slate-500">Tipo</dt><dd class="text-slate-900">{{ KIND[selected.kind].label }}</dd></div>
        <div><dt class="text-slate-500">Plazo</dt><dd :class="['tabular-nums', selected.overdue ? 'font-semibold text-red-800' : 'text-slate-900']">{{ formatDateTime(selected.at) }}<span v-if="selected.overdue"> (vencido)</span></dd></div>
        <div><dt class="text-slate-500">Expediente</dt><dd><RouterLink :to="{ name: 'cases-detail', params: { id: selected.caseId } }" class="font-medium tabular-nums text-sky-800 hover:underline" @click="selected = null">{{ folioOf(selected.caseId) }}</RouterLink></dd></div>
        <p class="text-xs text-slate-500">Hora de referencia: {{ formatTime(selected.at) }}.</p>
      </dl>
    </Dialog>
  </div>
</template>
