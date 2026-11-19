<script setup lang="ts">
import { ref, watch } from 'vue';
import Textarea from 'primevue/textarea';
import FormField from '@/components/FormField.vue';
import MutationDialog from '@/components/MutationDialog.vue';
import { useArchiveCase } from '@/composables/useCases';
import { maxLength, minLength } from '@/lib/validation';
import type { CaseRecord } from '@/types/api';

const props = defineProps<{ caseRecord: CaseRecord }>();
const visible = defineModel<boolean>('visible', { default: false });
const emit = defineEmits<{ archived: [] }>();
const archive = useArchiveCase(props.caseRecord.id);
const reason = ref('');
const error = ref<string | null>(null);

watch(visible, (open) => { if (open) { reason.value = ''; error.value = null; archive.reset(); } });
async function submit() {
  error.value = minLength(3)(reason.value.trim()) ?? maxLength(1000)(reason.value);
  if (error.value) return;
  try { await archive.mutateAsync({ expectedVersion: props.caseRecord.version, reason: reason.value.trim() }); visible.value = false; emit('archived'); } catch { /* El diálogo presenta el error de servidor. */ }
}
</script>

<template>
  <MutationDialog v-model:visible="visible" header="Archivar caso" submit-label="Archivar caso" :pending="archive.isPending.value" :error="archive.error.value" danger @submit="submit">
    <p class="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">El caso dejará de aparecer en los listados operativos y no se eliminarán sus antecedentes. Podrá revisarse desde Archivados.</p>
    <FormField id="archive-reason" label="Motivo del archivo" required :error="error" help="Queda registrado junto al expediente.">
      <template #default="{ id, invalid, describedby }"><Textarea :id="id" v-model="reason" rows="3" auto-resize maxlength="1000" :invalid="invalid" :aria-describedby="describedby" class="w-full" /></template>
    </FormField>
  </MutationDialog>
</template>
