<script setup lang="ts">
import { reactive, ref } from 'vue';
import Button from 'primevue/button';
import Textarea from 'primevue/textarea';
import DetailPanel from '@/components/DetailPanel.vue';
import FormField from '@/components/FormField.vue';
import PendingNotice from '@/components/PendingNotice.vue';
import ResourceDetailShell from '@/components/ResourceDetailShell.vue';
import SectionCard from '@/components/SectionCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { formatDateTime } from '@/lib/format';
import { required, validate } from '@/lib/validation';
import { submitResource } from '@/services/resources';

defineProps<{ id: string }>();
const form = reactive({ notes: '' });
const error = ref<string | null>(null);
const result = ref<unknown>(null);

async function save(followUpId: string) {
  error.value = validate(form.notes, [required('Describa el resultado del seguimiento.')]);
  if (error.value) return;
  try { await submitResource('followUps', 'PATCH', `/${followUpId}`); } catch (e) { result.value = e; }
}
</script>

<template>
  <ResourceDetailShell
    :id="id" resource="followUps" subject="el seguimiento" :back="{ to: { name: 'followups' }, label: 'Volver a seguimientos' }"
    :title="(f) => f.type" :description="(f) => `Caso ${f.caseFolio}, programado para el ${formatDateTime(f.scheduledAt)}.`"
  >
    <template #badges="{ item }"><StatusBadge :status="item.status" /></template>
    <template #default="{ item }">
      <div class="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Datos del seguimiento">
          <DetailPanel :items="[
            { key: 'type', label: 'Tipo', value: item.type }, { key: 'case', label: 'Caso', value: item.caseFolio },
            { key: 'responsible', label: 'Responsable', value: item.responsible }, { key: 'date', label: 'Fecha programada', value: formatDateTime(item.scheduledAt) }
          ]" />
        </SectionCard>
        <SectionCard title="Registrar resultado">
          <form novalidate class="space-y-4" @submit.prevent="save(item.id)">
            <FormField id="seg-notas" label="Resultado y observaciones" required :error="error">
              <template #default="{ id: fid, invalid, describedby }">
                <Textarea :id="fid" v-model="form.notes" rows="5" auto-resize :invalid="invalid" :aria-describedby="describedby" class="w-full" />
              </template>
            </FormField>
            <PendingNotice :error="result" action="el registro del seguimiento" />
            <div class="flex justify-end"><Button type="submit" label="Registrar resultado" /></div>
          </form>
        </SectionCard>
      </div>
    </template>
  </ResourceDetailShell>
</template>
