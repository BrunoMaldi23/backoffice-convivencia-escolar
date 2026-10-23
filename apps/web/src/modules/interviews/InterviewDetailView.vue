<script setup lang="ts">
import { ref } from 'vue';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import AppIcon from '@/components/AppIcon.vue';
import DetailPanel from '@/components/DetailPanel.vue';
import InstitutionLogo from '@/components/InstitutionLogo.vue';
import ResourceDetailShell from '@/components/ResourceDetailShell.vue';
import ResourceForm from '@/components/ResourceForm.vue';
import SectionCard from '@/components/SectionCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { formatDate, formatDateTime, formatTime } from '@/lib/format';
import { agreementSections } from './interviews.config';

defineProps<{ id: string }>();
const previewOpen = ref(false);
</script>

<template>
  <ResourceDetailShell
    :id="id" resource="interviews" subject="la entrevista" :back="{ to: { name: 'interviews' }, label: 'Volver a entrevistas' }"
    :title="(i) => `Entrevista ${i.folio}`" :description="(i) => `Caso ${i.caseFolio}, ${formatDateTime(i.scheduledAt)}.`"
  >
    <template #badges="{ item }"><StatusBadge :status="item.status" /></template>
    <template #actions>
      <Button label="Vista previa del acta" severity="secondary" outlined @click="previewOpen = true"><template #icon><AppIcon name="printer" :size="16" /></template></Button>
    </template>
    <template #default="{ item }">
      <div class="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Datos de la entrevista">
          <DetailPanel :columns="1" :items="[
            { key: 'case', label: 'Caso', value: item.caseFolio }, { key: 'participant', label: 'Participante', value: item.participant },
            { key: 'interviewer', label: 'Entrevistador/a', value: item.interviewer }, { key: 'mode', label: 'Modalidad', value: item.mode },
            { key: 'date', label: 'Fecha y hora', value: formatDateTime(item.scheduledAt) }
          ]" />
        </SectionCard>
        <div class="lg:col-span-2">
          <ResourceForm :sections="agreementSections" resource="interviews" method="PATCH" submit-label="Guardar registro" action-name="el registro de la entrevista" :cancel-to="{ name: 'interviews' }" id-prefix="acuerdos" />
        </div>
      </div>

      <Dialog v-model:visible="previewOpen" header="Vista previa del acta" modal :draggable="false" :style="{ width: '48rem' }" :breakpoints="{ '768px': 'calc(100vw - 1.5rem)' }">
        <p class="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Vista previa de formato. No es un documento oficial: el acta firmada se generará desde el servidor.
        </p>
        <article class="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-800 sm:p-10">
          <header class="flex items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <InstitutionLogo variant="emblem" :size="48" />
            <div class="text-right">
              <p class="font-semibold">Acta de entrevista</p>
              <p class="tabular-nums text-slate-500">{{ item.folio }}</p>
            </div>
          </header>
          <dl class="mt-6 grid grid-cols-2 gap-4">
            <div><dt class="text-xs text-slate-500">Caso</dt><dd class="tabular-nums">{{ item.caseFolio }}</dd></div>
            <div><dt class="text-xs text-slate-500">Fecha</dt><dd class="tabular-nums">{{ formatDate(item.scheduledAt) }}, {{ formatTime(item.scheduledAt) }}</dd></div>
            <div><dt class="text-xs text-slate-500">Participante</dt><dd>{{ item.participant }}</dd></div>
            <div><dt class="text-xs text-slate-500">Entrevistador/a</dt><dd>{{ item.interviewer }}</dd></div>
          </dl>
          <section class="mt-8"><h3 class="font-semibold">Síntesis</h3><p class="mt-2 h-16 rounded border border-dashed border-slate-200" /></section>
          <section class="mt-6"><h3 class="font-semibold">Acuerdos</h3><p class="mt-2 h-16 rounded border border-dashed border-slate-200" /></section>
          <footer class="mt-14 grid grid-cols-2 gap-10 text-center text-xs text-slate-500">
            <p class="border-t border-slate-300 pt-2">Firma entrevistador/a</p><p class="border-t border-slate-300 pt-2">Firma participante</p>
          </footer>
        </article>
        <template #footer>
          <Button label="Cerrar" severity="secondary" text @click="previewOpen = false" />
          <Button label="Generar acta oficial" disabled title="Requiere generación en el servidor" />
        </template>
      </Dialog>
    </template>
  </ResourceDetailShell>
</template>
