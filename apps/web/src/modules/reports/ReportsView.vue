<script setup lang="ts">
import { ref } from 'vue';
import Button from 'primevue/button';
import DatePicker from 'primevue/datepicker';
import Select from 'primevue/select';
import AppIcon from '@/components/AppIcon.vue';
import BarChart from '@/components/BarChart.vue';
import FormField from '@/components/FormField.vue';
import PageHeader from '@/components/PageHeader.vue';
import PreviewBadge from '@/components/PreviewBadge.vue';
import QueryState from '@/components/QueryState.vue';
import SectionCard from '@/components/SectionCard.vue';
import { useResource } from '@/composables/useResource';
import { isUiPreview } from '@/config/preview';
import { formatNumber } from '@/lib/format';
import { CASE_TYPES } from '../cases/cases.config';

/** Reportes. Sin endpoint de estadísticas, solo se muestran datos de demostración en previsualización, nunca como cifras oficiales. */
const query = useResource('dashboard');
const range = ref<Date[] | null>(null);
const category = ref<string | null>(null);
</script>

<template>
  <div>
    <PageHeader title="Reportes" description="Indicadores de convivencia escolar por período y categoría.">
      <template #badges><PreviewBadge /></template>
      <template #actions>
        <Button label="Exportar" severity="secondary" outlined disabled title="La exportación se generará en el servidor"><template #icon><AppIcon name="download" :size="16" /></template></Button>
      </template>
    </PageHeader>

    <div class="mb-6 grid gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-[18rem_16rem_auto] lg:items-end">
      <FormField id="rep-periodo" label="Período">
        <template #default="{ id }"><DatePicker v-model="range" :input-id="id" selection-mode="range" date-format="dd-mm-yy" placeholder="dd-mm-aaaa — dd-mm-aaaa" show-icon icon-display="input" class="w-full" /></template>
      </FormField>
      <FormField id="rep-categoria" label="Categoría">
        <template #default="{ id }"><Select v-model="category" :input-id="id" :options="CASE_TYPES" placeholder="Todas" show-clear class="w-full" /></template>
      </FormField>
      <p class="text-xs leading-relaxed text-slate-500">Los filtros se aplicarán en el servidor al conectar el servicio de estadísticas.</p>
    </div>

    <p v-if="isUiPreview" class="mb-4 rounded-lg border border-dashed border-amber-400 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
      Cifras sintéticas para revisar el diseño. No son estadísticas oficiales del establecimiento.
    </p>

    <div :class="query.data.value ? '' : 'rounded-xl border border-slate-200 bg-white'">
      <QueryState :data="query.data.value" :is-pending="query.isPending.value" :error="query.error.value" subject="los reportes" @retry="query.refetch()">
        <template #default="{ data }">
          <div class="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Casos ingresados por mes"><BarChart :data="data.trend" title="Casos ingresados" /></SectionCard>
            <SectionCard title="Casos activos por tipo"><BarChart :data="data.byType" title="Casos por tipo de situación" horizontal /></SectionCard>
            <SectionCard title="Resumen del período" flush class="lg:col-span-2">
              <table class="w-full text-sm">
                <caption class="sr-only">Resumen de indicadores del período</caption>
                <thead><tr class="border-b border-slate-200 bg-slate-50 text-left text-slate-600"><th class="px-5 py-2.5 font-semibold">Indicador</th><th class="px-5 py-2.5 text-right font-semibold">Valor</th></tr></thead>
                <tbody>
                  <tr v-for="[label, value] in [['Casos activos', data.stats.activeCases], ['Casos nuevos', data.stats.newCases], ['Casos críticos', data.stats.criticalCases], ['Casos cerrados', data.stats.closedCases], ['Medidas pendientes', data.stats.pendingMeasures], ['Tareas vencidas', data.stats.overdueTasks]] as const" :key="label" class="border-b border-slate-100 last:border-0">
                    <td class="px-5 py-2.5 text-slate-700">{{ label }}</td><td class="px-5 py-2.5 text-right tabular-nums text-slate-900">{{ formatNumber(value) }}</td>
                  </tr>
                </tbody>
              </table>
            </SectionCard>
          </div>
        </template>
      </QueryState>
    </div>
  </div>
</template>
