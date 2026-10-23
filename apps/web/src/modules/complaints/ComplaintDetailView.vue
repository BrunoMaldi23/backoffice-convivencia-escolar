<script setup lang="ts">
import { ref } from 'vue';
import Button from 'primevue/button';
import Select from 'primevue/select';
import DetailPanel from '@/components/DetailPanel.vue';
import EmptyState from '@/components/EmptyState.vue';
import FormField from '@/components/FormField.vue';
import PendingNotice from '@/components/PendingNotice.vue';
import ResourceDetailShell from '@/components/ResourceDetailShell.vue';
import SectionCard from '@/components/SectionCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import Timeline from '@/components/Timeline.vue';
import { formatDate } from '@/lib/format';
import { optionsFrom } from '@/lib/status';
import { submitResource } from '@/services/resources';
import type { Complaint } from '@/types/models';
import { CLASSIFICATIONS } from './complaints.config';

defineProps<{ id: string }>();
const classification = ref<string | null>(null);
const status = ref<string | null>(null);
const saveError = ref<unknown>(null);
const saving = ref(false);

async function saveClassification(c: Complaint) {
  saving.value = true;
  saveError.value = null;
  try { await submitResource('complaints', 'PATCH', `/${c.id}/classification`); } catch (e) { saveError.value = e; } finally { saving.value = false; }
}
</script>

<template>
  <ResourceDetailShell
    :id="id" resource="complaints" subject="la denuncia" :back="{ to: { name: 'complaints' }, label: 'Volver a denuncias' }"
    :title="(c) => `Denuncia ${c.folio}`" :description="(c) => `${c.category}. Recibida el ${formatDate(c.receivedAt)} por ${c.channel.toLowerCase()}.`"
  >
    <template #badges="{ item }"><StatusBadge :status="item.status" /></template>
    <template #default="{ item }">
      <div class="grid gap-6 lg:grid-cols-3">
        <div class="space-y-6 lg:col-span-2">
          <SectionCard title="Datos de la denuncia">
            <DetailPanel :items="[
              { key: 'folio', label: 'Folio', value: item.folio }, { key: 'category', label: 'Categoría', value: item.category },
              { key: 'channel', label: 'Canal de recepción', value: item.channel }, { key: 'receivedAt', label: 'Fecha de recepción', value: formatDate(item.receivedAt) },
              { key: 'assignedTo', label: 'Asignada a', value: item.assignedTo }, { key: 'classification', label: 'Clasificación actual', value: item.classification }
            ]" />
          </SectionCard>
          <SectionCard title="Seguimiento de la denuncia">
            <Timeline :entries="[
              { id: 'r', title: 'Denuncia recibida', at: item.receivedAt, tone: 'info', meta: item.channel },
              ...(item.status !== 'recibida' ? [{ id: 'c', title: `Clasificada como ${item.classification.toLowerCase()}`, at: item.receivedAt, tone: 'progress' as const }] : [])
            ]" />
          </SectionCard>
          <SectionCard title="Evidencias">
            <EmptyState compact icon="paperclip" title="Sin evidencias adjuntas" description="La carga de archivos estará disponible cuando exista almacenamiento seguro en el servidor.">
              <Button label="Adjuntar evidencia" outlined size="small" disabled title="Integración pendiente" />
            </EmptyState>
          </SectionCard>
        </div>

        <SectionCard title="Clasificación y estado" description="Defina la gravedad según el reglamento interno.">
          <form class="space-y-4" @submit.prevent="saveClassification(item)">
            <FormField id="denuncia-clasificacion" label="Clasificación">
              <template #default="{ id: fid }">
                <Select v-model="classification" :input-id="fid" :options="CLASSIFICATIONS" :placeholder="item.classification" class="w-full" />
              </template>
            </FormField>
            <FormField id="denuncia-estado" label="Estado">
              <template #default="{ id: fid }">
                <Select v-model="status" :input-id="fid" :options="optionsFrom(['recibida', 'clasificada', 'en_revision', 'derivada', 'desestimada'])" option-label="label" option-value="value" placeholder="Sin cambios" class="w-full" />
              </template>
            </FormField>
            <PendingNotice :error="saveError" action="el cambio de clasificación" />
            <Button type="submit" label="Guardar clasificación" class="w-full" :loading="saving" :disabled="!classification && !status" />
            <p class="text-xs leading-relaxed text-slate-500">Si la denuncia da origen a un caso, éste se creará desde el expediente con su folio propio.</p>
          </form>
        </SectionCard>
      </div>
    </template>
  </ResourceDetailShell>
</template>
