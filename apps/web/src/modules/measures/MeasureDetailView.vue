<script setup lang="ts">
import { RouterLink } from 'vue-router';
import Button from 'primevue/button';
import DetailPanel from '@/components/DetailPanel.vue';
import PriorityBadge from '@/components/PriorityBadge.vue';
import RelatedTable from '@/components/RelatedTable.vue';
import ResourceDetailShell from '@/components/ResourceDetailShell.vue';
import SectionCard from '@/components/SectionCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { formatDate } from '@/lib/format';
import { followUpColumns } from '../followups/followups.config';

defineProps<{ id: string }>();
</script>

<template>
  <ResourceDetailShell
    :id="id" resource="measures" subject="la medida" :back="{ to: { name: 'measures' }, label: 'Volver a medidas' }"
    :title="(m) => m.type" :description="(m) => `Medida ${m.folio} del caso ${m.caseFolio}.`"
  >
    <template #badges="{ item }"><StatusBadge :status="item.status" /></template>
    <template #actions><Button label="Registrar evaluación" severity="secondary" outlined disabled title="Integración pendiente" /></template>
    <template #default="{ item }">
      <div class="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Datos de la medida" class="lg:col-span-2">
          <DetailPanel :items="[
            { key: 'folio', label: 'Folio', value: item.folio }, { key: 'case', label: 'Caso' }, { key: 'responsible', label: 'Responsable', value: item.responsible },
            { key: 'priority', label: 'Prioridad' }, { key: 'start', label: 'Fecha de inicio', value: formatDate(item.startDate) },
            { key: 'end', label: 'Fecha de término', value: item.endDate ? formatDate(item.endDate) : 'Sin fecha: se evalúa en seguimiento' }
          ]">
            <template #item-case><RouterLink :to="{ name: 'cases' }" class="font-medium tabular-nums text-sky-800 hover:underline">{{ item.caseFolio }}</RouterLink></template>
            <template #item-priority><PriorityBadge :priority="item.priority" /></template>
          </DetailPanel>
        </SectionCard>
        <SectionCard title="Vigencia">
          <p class="text-sm leading-relaxed text-slate-700">
            <template v-if="item.status === 'vigente'">La medida está en aplicación. Registre su evaluación en cada seguimiento.</template>
            <template v-else-if="item.status === 'pendiente'">La medida fue acordada y está pendiente de implementación.</template>
            <template v-else-if="item.status === 'vencida'">Se cumplió el plazo sin evaluación registrada. Revise con el responsable.</template>
            <template v-else>La medida finalizó.</template>
          </p>
        </SectionCard>
        <SectionCard title="Seguimientos del caso" flush class="lg:col-span-3">
          <RelatedTable resource="followUps" field="caseFolio" :value="item.caseFolio" :columns="followUpColumns.filter((c) => c.field !== 'caseFolio')" detail-route="followups-detail" label="Seguimientos" empty-title="Sin seguimientos" empty-icon="activity" />
        </SectionCard>
      </div>
    </template>
  </ResourceDetailShell>
</template>
