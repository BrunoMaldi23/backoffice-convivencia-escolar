<script setup lang="ts">
import Button from 'primevue/button';
import DetailPanel from '@/components/DetailPanel.vue';
import ResourceDetailShell from '@/components/ResourceDetailShell.vue';
import SectionCard from '@/components/SectionCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { formatDate, formatDateTime, formatTime } from '@/lib/format';

defineProps<{ id: string }>();
</script>

<template>
  <ResourceDetailShell
    :id="id" resource="citations" subject="la citación" :back="{ to: { name: 'citations' }, label: 'Volver a citaciones' }"
    :title="(c) => `Citación ${c.folio}`" :description="(c) => `Caso ${c.caseFolio}.`"
  >
    <template #badges="{ item }"><StatusBadge :status="item.status" /></template>
    <template #actions>
      <Button label="Registrar asistencia" severity="secondary" outlined disabled title="Integración pendiente" />
      <Button label="Enviar citación" disabled title="El envío se realizará desde el servidor" />
    </template>
    <template #default="{ item }">
      <div class="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Datos de la citación">
          <DetailPanel :items="[
            { key: 'recipient', label: 'Persona citada', value: item.recipient }, { key: 'case', label: 'Caso', value: item.caseFolio },
            { key: 'date', label: 'Fecha y hora', value: formatDateTime(item.scheduledAt) }, { key: 'channel', label: 'Canal de aviso', value: item.channel }
          ]" />
        </SectionCard>
        <SectionCard title="Vista previa del aviso" description="Formato referencial; el texto definitivo lo emitirá el servidor.">
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm leading-relaxed text-slate-700">
            <p>Estimado/a {{ item.recipient.toLowerCase() }}:</p>
            <p class="mt-3">
              Le citamos a una reunión con el equipo de convivencia escolar el día <strong class="tabular-nums">{{ formatDate(item.scheduledAt) }}</strong>
              a las <strong class="tabular-nums">{{ formatTime(item.scheduledAt) }}</strong> horas.
            </p>
            <p class="mt-3">Agradecemos confirmar su asistencia.</p>
          </div>
        </SectionCard>
      </div>
    </template>
  </ResourceDetailShell>
</template>
