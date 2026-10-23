<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Textarea from 'primevue/textarea';
import FormField from '@/components/FormField.vue';
import MutationDialog from '@/components/MutationDialog.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { useTransitionCase } from '@/composables/useCases';
import { transitionLabel, transitionNeedsReason } from '@/lib/catalogs';
import { maxLength } from '@/lib/validation';
import type { CaseRecord, CaseStatus } from '@/types/api';

/** Cambia el estado (`POST /cases/:id/transition`). El servidor valida la máquina de estados, el motivo y los permisos de cierre o reapertura. */
const props = defineProps<{ caseRecord: CaseRecord; target: CaseStatus | null }>();
const visible = defineModel<boolean>('visible', { default: false });
const emit = defineEmits<{ reload: [] }>();
const transition = useTransitionCase(props.caseRecord.id);
const reason = ref('');
const error = ref<string | null>(null);

const needsReason = computed(() => (props.target ? transitionNeedsReason(props.caseRecord.status, props.target) : false));
const title = computed(() => (props.target ? transitionLabel(props.caseRecord.status, props.target) : 'Cambiar estado'));
const warning = computed(() => (props.target === 'CERRADO'
  ? 'Al cerrar el expediente no se podrán registrar documentos ni medidas hasta que se reabra. Verifique que las medidas y los seguimientos estén al día.'
  : props.caseRecord.status === 'CERRADO' ? 'La reapertura vuelve el expediente a evaluación y queda registrada en el historial.' : null));

watch(visible, (open) => { if (open) { reason.value = ''; error.value = null; transition.reset(); } });

async function submit() {
  if (!props.target) return;
  error.value = needsReason.value && !reason.value.trim() ? 'Escriba el motivo del cambio.' : maxLength(1000)(reason.value);
  if (error.value) return;
  try {
    await transition.mutateAsync({ toStatus: props.target, expectedVersion: props.caseRecord.version, ...(reason.value.trim() ? { reason: reason.value.trim() } : {}) });
    visible.value = false;
  } catch { /* el error se muestra en el diálogo */ }
}
</script>

<template>
  <MutationDialog v-model:visible="visible" :header="title" :submit-label="title" :pending="transition.isPending.value" :error="transition.error.value" :danger="target === 'CERRADO'" @submit="submit" @reload="emit('reload')">
    <p v-if="target" class="flex flex-wrap items-center gap-2 text-sm text-slate-700">
      Estado actual <StatusBadge :status="caseRecord.status" /> pasará a <StatusBadge :status="target" />
    </p>
    <p v-if="warning" class="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">{{ warning }}</p>
    <FormField id="tr-reason" label="Motivo" :required="needsReason" :help="needsReason ? 'Obligatorio para este cambio. Queda registrado en el historial.' : 'Opcional.'" :error="error">
      <template #default="{ id, invalid, describedby }"><Textarea :id="id" v-model="reason" rows="3" auto-resize maxlength="1000" :invalid="invalid" :aria-describedby="describedby" class="w-full" /></template>
    </FormField>
  </MutationDialog>
</template>
