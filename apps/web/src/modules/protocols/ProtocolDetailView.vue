<script setup lang="ts">
import Button from 'primevue/button';
import DetailPanel from '@/components/DetailPanel.vue';
import EmptyState from '@/components/EmptyState.vue';
import ResourceDetailShell from '@/components/ResourceDetailShell.vue';
import SectionCard from '@/components/SectionCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { formatDate } from '@/lib/format';

/**
 * Detalle de protocolo. Las etapas son una estructura genérica de visualización: los nombres, plazos y
 * responsables reales provendrán del reglamento cargado en el servidor. No se asignan plazos legales.
 */
defineProps<{ id: string }>();
const STAGE_NAMES = ['Recepción y registro', 'Evaluación inicial', 'Medidas de resguardo', 'Indagación', 'Resolución', 'Seguimiento y cierre'];
</script>

<template>
  <ResourceDetailShell
    :id="id" resource="protocols" subject="el protocolo" :back="{ to: { name: 'protocols' }, label: 'Volver a protocolos' }"
    :title="(p) => p.name" :description="(p) => `${p.code}, categoría ${p.category.toLowerCase()}.`"
  >
    <template #badges="{ item }"><StatusBadge :status="item.status" /></template>
    <template #actions><Button label="Activar en un caso" outlined disabled title="La activación se realiza desde el expediente y requiere integración" /></template>
    <template #default="{ item }">
      <div class="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Etapas del protocolo" description="Estructura de referencia; el contenido normativo se cargará desde el reglamento interno." class="lg:col-span-2">
          <ol class="space-y-0">
            <li v-for="(stage, i) in STAGE_NAMES.slice(0, item.stages)" :key="stage" class="relative flex gap-4 pb-6 last:pb-0">
              <span v-if="i < item.stages - 1" class="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px bg-slate-200" aria-hidden="true" />
              <span class="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-sm font-semibold tabular-nums text-slate-700">{{ i + 1 }}</span>
              <div class="pt-1">
                <p class="text-sm font-medium text-slate-900">{{ stage }}</p>
                <p class="mt-0.5 text-sm text-slate-500">Responsable, plazo y registros según el reglamento interno.</p>
              </div>
            </li>
          </ol>
        </SectionCard>
        <div class="space-y-6">
          <SectionCard title="Información">
            <DetailPanel :columns="1" :items="[
              { key: 'code', label: 'Código', value: item.code }, { key: 'category', label: 'Categoría', value: item.category },
              { key: 'cases', label: 'Casos con el protocolo activo', value: item.activeCases }, { key: 'updated', label: 'Última actualización', value: formatDate(item.updatedAt) }
            ]" />
          </SectionCard>
          <SectionCard title="Tareas relacionadas">
            <EmptyState compact icon="check-square" title="Sin tareas asociadas" description="Las tareas se generarán por etapa cuando el protocolo se active en un caso." />
          </SectionCard>
          <SectionCard title="Historial de versiones">
            <EmptyState compact icon="history" title="Sin versiones registradas" />
          </SectionCard>
        </div>
      </div>
    </template>
  </ResourceDetailShell>
</template>
