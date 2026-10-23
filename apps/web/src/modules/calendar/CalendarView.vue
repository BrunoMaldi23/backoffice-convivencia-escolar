<script setup lang="ts">
import { computed, ref } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import SelectButton from 'primevue/selectbutton';
import AppIcon from '@/components/AppIcon.vue';
import DetailPanel from '@/components/DetailPanel.vue';
import ErrorState from '@/components/ErrorState.vue';
import LoadingState from '@/components/LoadingState.vue';
import PageHeader from '@/components/PageHeader.vue';
import PreviewBadge from '@/components/PreviewBadge.vue';
import { useResource } from '@/composables/useResource';
import { formatDateTime, formatTime } from '@/lib/format';
import type { CalendarEvent } from '@/types/models';

/** Calendario mensual y semanal sin dependencias: cuadrícula CSS y fechas en hora de Chile. */
const query = useResource('calendar');
const view = ref<'month' | 'week'>('month');
const cursor = ref(new Date());
const selected = ref<CalendarEvent | null>(null);

const TYPE_STYLE: Record<CalendarEvent['type'], { label: string; cls: string }> = {
  entrevista: { label: 'Entrevista', cls: 'border-l-sky-600 bg-sky-50 text-sky-900' },
  citacion: { label: 'Citación', cls: 'border-l-amber-500 bg-amber-50 text-amber-900' },
  seguimiento: { label: 'Seguimiento', cls: 'border-l-emerald-600 bg-emerald-50 text-emerald-900' },
  tarea: { label: 'Tarea', cls: 'border-l-slate-500 bg-slate-100 text-slate-800' },
  reunion: { label: 'Reunión', cls: 'border-l-indigo-500 bg-indigo-50 text-indigo-900' }
};
const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const startOfWeek = (d: Date) => { const r = new Date(d); r.setHours(0, 0, 0, 0); r.setDate(r.getDate() - ((r.getDay() + 6) % 7)); return r; };
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

const days = computed(() => {
  if (view.value === 'week') return Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor.value), i));
  const first = new Date(cursor.value.getFullYear(), cursor.value.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
});
const byDay = computed(() => {
  const map = new Map<string, CalendarEvent[]>();
  for (const e of [...(query.data.value ?? [])].sort((a, b) => a.start.localeCompare(b.start))) {
    const key = dayKey(new Date(e.start));
    map.set(key, [...(map.get(key) ?? []), e]);
  }
  return map;
});
const title = computed(() => {
  const fmt = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' }).format(cursor.value);
  if (view.value === 'month') return fmt.charAt(0).toUpperCase() + fmt.slice(1);
  const s = startOfWeek(cursor.value);
  const e = addDays(s, 6);
  return `Semana del ${s.getDate()} al ${e.getDate()} de ${new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(e)}`;
});
const todayKey = dayKey(new Date());
function move(step: number) {
  const d = new Date(cursor.value);
  if (view.value === 'month') d.setMonth(d.getMonth() + step, 1); else d.setDate(d.getDate() + step * 7);
  cursor.value = d;
}
const dayLabel = (d: Date) => new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
</script>

<template>
  <div>
    <PageHeader title="Calendario" description="Entrevistas, citaciones, seguimientos y reuniones del equipo.">
      <template #badges><PreviewBadge /></template>
      <template #actions>
        <SelectButton v-model="view" :options="[{ label: 'Mes', value: 'month' }, { label: 'Semana', value: 'week' }]" option-label="label" option-value="value" :allow-empty="false" aria-label="Vista del calendario" />
      </template>
    </PageHeader>

    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-labelledby="cal-title">
      <header class="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3">
        <div class="flex items-center gap-1">
          <Button text rounded severity="secondary" aria-label="Período anterior" @click="move(-1)"><template #icon><AppIcon name="chevron-left" :size="18" /></template></Button>
          <Button text rounded severity="secondary" aria-label="Período siguiente" @click="move(1)"><template #icon><AppIcon name="chevron-right" :size="18" /></template></Button>
        </div>
        <h2 id="cal-title" class="text-base font-semibold text-slate-900" aria-live="polite">{{ title }}</h2>
        <Button label="Hoy" size="small" outlined severity="secondary" class="ml-auto" @click="cursor = new Date()" />
      </header>

      <LoadingState v-if="query.isPending.value" :rows="6" />
      <ErrorState v-else-if="query.error.value" :error="query.error.value" subject="el calendario" @retry="query.refetch()" />

      <template v-else>
        <!-- Mes en escritorio y tablet: cuadrícula de 7 columnas -->
        <div v-if="view === 'month'" class="hidden md:block">
          <div class="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
            <div v-for="d in WEEKDAYS" :key="d" class="px-2 py-2">{{ d }}</div>
          </div>
          <div class="grid grid-cols-7">
            <div
              v-for="d in days" :key="dayKey(d)"
              :class="['min-h-28 border-b border-r border-slate-100 p-1.5 [&:nth-child(7n)]:border-r-0', d.getMonth() === cursor.getMonth() ? '' : 'bg-slate-50/70']"
            >
              <p :class="['mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs tabular-nums', dayKey(d) === todayKey ? 'bg-sky-700 font-semibold text-white' : d.getMonth() === cursor.getMonth() ? 'text-slate-700' : 'text-slate-400']">
                {{ d.getDate() }}
              </p>
              <ul class="space-y-1">
                <li v-for="e in (byDay.get(dayKey(d)) ?? []).slice(0, 3)" :key="e.id">
                  <button type="button" :class="['block w-full truncate rounded border-l-2 px-1.5 py-0.5 text-left text-[11px] leading-snug', TYPE_STYLE[e.type].cls]" @click="selected = e">
                    <span class="tabular-nums">{{ formatTime(e.start) }}</span> {{ e.title }}
                  </button>
                </li>
                <li v-if="(byDay.get(dayKey(d)) ?? []).length > 3" class="px-1.5 text-[11px] text-slate-500">y {{ (byDay.get(dayKey(d)) ?? []).length - 3 }} más</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Semana, y mes en móvil: agenda por día -->
        <ol :class="['divide-y divide-slate-100', view === 'month' ? 'md:hidden' : '']">
          <template v-for="d in days" :key="`a-${dayKey(d)}`">
            <li v-if="view === 'week' || (d.getMonth() === cursor.getMonth() && byDay.get(dayKey(d)))" class="flex gap-4 px-4 py-3">
              <p :class="['w-28 shrink-0 text-sm first-letter:uppercase', dayKey(d) === todayKey ? 'font-semibold text-sky-800' : 'text-slate-600']">{{ dayLabel(d) }}</p>
              <ul v-if="byDay.get(dayKey(d))" class="min-w-0 flex-1 space-y-1.5">
                <li v-for="e in byDay.get(dayKey(d))" :key="e.id">
                  <button type="button" :class="['flex w-full gap-2 rounded border-l-2 px-2.5 py-1.5 text-left text-sm', TYPE_STYLE[e.type].cls]" @click="selected = e">
                    <span class="tabular-nums">{{ formatTime(e.start) }}</span><span class="truncate">{{ e.title }}</span>
                  </button>
                </li>
              </ul>
              <p v-else class="text-sm text-slate-400">Sin actividades</p>
            </li>
          </template>
        </ol>
      </template>

      <footer class="flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-200 px-4 py-3 text-xs text-slate-600">
        <span v-for="(s, k) in TYPE_STYLE" :key="k" class="flex items-center gap-1.5"><span :class="['h-3 w-1 rounded-sm border-l-2', s.cls]" />{{ s.label }}</span>
      </footer>
    </section>

    <Dialog :visible="Boolean(selected)" :header="selected?.title" modal :draggable="false" :style="{ width: '28rem' }" :breakpoints="{ '640px': 'calc(100vw - 2rem)' }" @update:visible="(v) => { if (!v) selected = null; }">
      <DetailPanel v-if="selected" :columns="1" :items="[
        { key: 'type', label: 'Tipo', value: TYPE_STYLE[selected.type].label }, { key: 'start', label: 'Inicio', value: formatDateTime(selected.start) },
        { key: 'end', label: 'Término', value: formatDateTime(selected.end) }, { key: 'place', label: 'Lugar', value: selected.place }
      ]" />
    </Dialog>
  </div>
</template>
