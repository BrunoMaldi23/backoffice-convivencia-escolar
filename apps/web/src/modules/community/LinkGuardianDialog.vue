<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import Button from 'primevue/button';
import Select from 'primevue/select';
import ToggleSwitch from 'primevue/toggleswitch';
import FormField from '@/components/FormField.vue';
import MutationDialog from '@/components/MutationDialog.vue';
import PersonPicker, { type PickedPerson } from '@/components/PersonPicker.vue';
import { useLinkStudentGuardian } from '@/composables/useCommunity';
import { RELATIONSHIP_OPTIONS } from '@/lib/catalogs';
import { fullName } from '@/lib/format';
import { required, validateAll } from '@/lib/validation';
import GuardianFormDialog from './GuardianFormDialog.vue';

/** Asocia un apoderado a un estudiante (`POST /students/:id/guardians`). Si no está registrado, se crea desde aquí mismo. */
const props = defineProps<{ studentId: string; establishmentId: string }>();
const visible = defineModel<boolean>('visible', { default: false });
const emit = defineEmits<{ reload: [] }>();

const link = useLinkStudentGuardian();
const form = reactive({ person: null as PickedPerson | null, relationship: 'MADRE' as string | null, isPrimary: false });
const errors = ref<Record<string, string>>({});
const createOpen = ref(false);
watch(visible, (open) => { if (open) { Object.assign(form, { person: null, relationship: 'MADRE', isPrimary: false }); errors.value = {}; link.reset(); } });

async function submit() {
  errors.value = validateAll(form, { person: [required('Busque y elija un apoderado/a, o regístrelo.')], relationship: [required('Seleccione el vínculo.')] }) as Record<string, string>;
  if (Object.keys(errors.value).length) return;
  try {
    await link.mutateAsync({ studentId: props.studentId, guardianId: form.person!.id, relationship: form.relationship!, isPrimary: form.isPrimary });
    visible.value = false;
  } catch { /* el error se muestra en el diálogo */ }
}
</script>

<template>
  <MutationDialog v-model:visible="visible" header="Agregar apoderado/a" submit-label="Agregar" :pending="link.isPending.value" :error="link.error.value" @submit="submit" @reload="emit('reload')">
    <FormField id="lg-person" label="Apoderado/a" required :error="errors.person">
      <template #default="{ id, invalid, describedby }"><PersonPicker :id="id" v-model="form.person" kind="APODERADO" :establishment-id="establishmentId" :invalid="invalid" :describedby="describedby" /></template>
    </FormField>
    <p class="-mt-2 text-sm text-slate-600">¿No está registrado/a? <Button label="Registrar apoderado/a" link size="small" class="!p-0" type="button" @click="createOpen = true" /></p>
    <FormField id="lg-rel" label="Vínculo con el estudiante" required :error="errors.relationship"><template #default="{ id, invalid }"><Select v-model="form.relationship" :input-id="id" :options="RELATIONSHIP_OPTIONS" option-label="label" option-value="value" :invalid="invalid" class="w-full" /></template></FormField>
    <div class="flex items-center gap-3">
      <ToggleSwitch v-model="form.isPrimary" input-id="lg-primary" />
      <label for="lg-primary" class="text-sm text-slate-800"><span class="block font-medium">Apoderado/a principal</span><span class="block text-xs text-slate-500">Solo una persona puede ser la principal; reemplaza a la anterior.</span></label>
    </div>
  </MutationDialog>
  <GuardianFormDialog v-model:visible="createOpen" :establishment-id="establishmentId" :guardian="null" @saved="(g) => { form.person = { id: g.id, label: fullName(g), detail: '' }; }" />
</template>
