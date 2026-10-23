<script setup lang="ts">
import { ref, watch } from 'vue';
import Textarea from 'primevue/textarea';
import FormField from '@/components/FormField.vue';
import MutationDialog from '@/components/MutationDialog.vue';
import UserSelect from '@/components/UserSelect.vue';
import { useAssignCase } from '@/composables/useCases';
import { maxLength } from '@/lib/validation';
import type { CaseRecord } from '@/types/api';

/** Asigna el responsable (`POST /cases/:id/assign`). El responsable debe tener membresía activa en el establecimiento (lo valida el servidor). */
const props = defineProps<{ caseRecord: CaseRecord }>();
const visible = defineModel<boolean>('visible', { default: false });
const emit = defineEmits<{ reload: [] }>();
const assign = useAssignCase(props.caseRecord.id);
const person = ref<string | null>(null);
const reason = ref('');
const error = ref<string | null>(null);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

watch(visible, (open) => {
  if (open) { person.value = props.caseRecord.responsibleUserId; reason.value = ''; error.value = null; assign.reset(); }
});

async function submit() {
  error.value = !person.value ? 'Seleccione a la persona responsable.' : !UUID.test(person.value) ? 'El identificador no es válido.' : maxLength(500)(reason.value);
  if (error.value) return;
  try {
    await assign.mutateAsync({ responsibleUserId: person.value!, expectedVersion: props.caseRecord.version, ...(reason.value.trim() ? { reason: reason.value.trim() } : {}) });
    visible.value = false;
  } catch { /* el error se muestra en el diálogo */ }
}
</script>

<template>
  <MutationDialog v-model:visible="visible" header="Asignar responsable" submit-label="Asignar" :pending="assign.isPending.value" :error="assign.error.value" @submit="submit" @reload="emit('reload')">
    <FormField id="as-user" label="Responsable" required :error="error">
      <template #default="{ id, invalid, describedby }"><UserSelect :id="id" v-model="person" :invalid="invalid" :describedby="describedby" /></template>
    </FormField>
    <FormField id="as-reason" label="Motivo" help="Opcional. Queda registrado en el historial del expediente.">
      <template #default="{ id }"><Textarea :id="id" v-model="reason" rows="3" auto-resize maxlength="500" class="w-full" /></template>
    </FormField>
  </MutationDialog>
</template>
