<script setup lang="ts">
import Button from 'primevue/button';
import DetailPanel from '@/components/DetailPanel.vue';
import ResourceDetailShell from '@/components/ResourceDetailShell.vue';
import SectionCard from '@/components/SectionCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import Timeline from '@/components/Timeline.vue';
import { formatDate } from '@/lib/format';

defineProps<{ id: string }>();
</script>

<template>
  <ResourceDetailShell
    :id="id" resource="referrals" subject="la derivación" :back="{ to: { name: 'referrals' }, label: 'Volver a derivaciones' }"
    :title="(r) => `Derivación ${r.folio}`" :description="(r) => `${r.institution}. Caso ${r.caseFolio}.`"
  >
    <template #badges="{ item }"><StatusBadge :status="item.status" /></template>
    <template #actions><Button label="Registrar respuesta" severity="secondary" outlined disabled title="Integración pendiente" /></template>
    <template #default="{ item }">
      <div class="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Datos de la derivación" class="lg:col-span-2">
          <DetailPanel :items="[
            { key: 'institution', label: 'Institución receptora', value: item.institution }, { key: 'type', label: 'Tipo de institución', value: item.institutionType },
            { key: 'case', label: 'Caso', value: item.caseFolio }, { key: 'responsible', label: 'Responsable interno', value: item.responsible },
            { key: 'sent', label: 'Fecha de envío', value: formatDate(item.sentAt) }
          ]" />
          <p class="mt-6 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">El sistema no envía comunicaciones a instituciones externas; registra la derivación realizada por los canales formales.</p>
        </SectionCard>
        <SectionCard title="Historial">
          <Timeline :entries="[
            { id: 'e', title: 'Derivación enviada', at: item.sentAt, tone: 'info', meta: item.responsible },
            ...(item.status === 'en_atencion' || item.status === 'cerrada' ? [{ id: 'a', title: 'Institución confirma atención', at: item.sentAt, tone: 'progress' as const }] : []),
            ...(item.status === 'cerrada' ? [{ id: 'c', title: 'Derivación cerrada', at: item.sentAt, tone: 'success' as const }] : [])
          ]" />
        </SectionCard>
      </div>
    </template>
  </ResourceDetailShell>
</template>
