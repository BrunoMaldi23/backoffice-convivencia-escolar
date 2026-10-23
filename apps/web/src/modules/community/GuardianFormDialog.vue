<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import InputText from 'primevue/inputtext';
import ToggleSwitch from 'primevue/toggleswitch';
import FormField from '@/components/FormField.vue';
import MutationDialog from '@/components/MutationDialog.vue';
import { useCreateGuardian, useUpdateGuardian } from '@/composables/useCommunity';
import { formatRut } from '@/lib/rut';
import { email, maxLength, required, rut, validateAll } from '@/lib/validation';
import type { Guardian } from '@/types/api';

/** Alta y edición de un apoderado (`POST/PATCH /guardians`). El RUT es opcional, pero si se escribe se valida. */
const props = defineProps<{ establishmentId: string; guardian: Guardian | null }>();
const visible = defineModel<boolean>('visible', { default: false });
const emit = defineEmits<{ saved: [guardian: Guardian]; reload: [] }>();

const create = useCreateGuardian();
const update = useUpdateGuardian();
const mutation = computed(() => (props.guardian ? update : create));
const form = reactive({ rut: '', firstNames: '', lastNames: '', email: '', phone: '', isActive: true });
const errors = ref<Record<string, string>>({});
watch(visible, (open) => {
  if (!open) return;
  const g = props.guardian;
  Object.assign(form, g ? { rut: g.rut ? formatRut(g.rut) : '', firstNames: g.firstNames, lastNames: g.lastNames, email: g.email ?? '', phone: g.phone ?? '', isActive: g.isActive } : { rut: '', firstNames: '', lastNames: '', email: '', phone: '', isActive: true });
  errors.value = {}; create.reset(); update.reset();
});

async function submit() {
  errors.value = validateAll(form, { rut: [rut()], firstNames: [required('Escriba los nombres.'), maxLength(120)], lastNames: [required('Escriba los apellidos.'), maxLength(120)], email: [email(), maxLength(180)], phone: [maxLength(30)] }) as Record<string, string>;
  if (Object.keys(errors.value).length) return;
  try {
    const saved = props.guardian
      ? await update.mutateAsync({ id: props.guardian.id, expectedVersion: props.guardian.version, rut: form.rut.trim() || null, firstNames: form.firstNames.trim(), lastNames: form.lastNames.trim(), email: form.email.trim() || null, phone: form.phone.trim() || null, isActive: form.isActive })
      : await create.mutateAsync({ establishmentId: props.establishmentId, rut: form.rut.trim() || undefined, firstNames: form.firstNames.trim(), lastNames: form.lastNames.trim(), email: form.email.trim() || undefined, phone: form.phone.trim() || undefined });
    visible.value = false;
    emit('saved', saved);
  } catch { /* el error se muestra en el diálogo */ }
}
</script>

<template>
  <MutationDialog v-model:visible="visible" :header="guardian ? 'Editar apoderado/a' : 'Nuevo apoderado/a'" :submit-label="guardian ? 'Guardar cambios' : 'Registrar apoderado/a'" :pending="mutation.isPending.value" :error="mutation.error.value" @submit="submit" @reload="emit('reload')">
    <div class="grid gap-4 sm:grid-cols-2">
      <FormField id="gu-first" label="Nombres" required :error="errors.firstNames"><template #default="{ id, invalid, describedby }"><InputText :id="id" v-model="form.firstNames" maxlength="120" :invalid="invalid" :aria-describedby="describedby" autocomplete="off" class="w-full" /></template></FormField>
      <FormField id="gu-last" label="Apellidos" required :error="errors.lastNames"><template #default="{ id, invalid, describedby }"><InputText :id="id" v-model="form.lastNames" maxlength="120" :invalid="invalid" :aria-describedby="describedby" autocomplete="off" class="w-full" /></template></FormField>
    </div>
    <FormField id="gu-rut" label="RUT" help="Opcional. Con o sin puntos." :error="errors.rut">
      <template #default="{ id, invalid, describedby }"><InputText :id="id" v-model="form.rut" maxlength="15" :invalid="invalid" :aria-describedby="describedby" autocomplete="off" class="w-full" @blur="form.rut = form.rut.trim() ? formatRut(form.rut) : ''" /></template>
    </FormField>
    <div class="grid gap-4 sm:grid-cols-2">
      <FormField id="gu-email" label="Correo" :error="errors.email"><template #default="{ id, invalid, describedby }"><InputText :id="id" v-model="form.email" type="email" maxlength="180" :invalid="invalid" :aria-describedby="describedby" autocomplete="off" class="w-full" /></template></FormField>
      <FormField id="gu-phone" label="Teléfono" :error="errors.phone"><template #default="{ id, invalid, describedby }"><InputText :id="id" v-model="form.phone" type="tel" maxlength="30" :invalid="invalid" :aria-describedby="describedby" autocomplete="off" class="w-full" /></template></FormField>
    </div>
    <div v-if="guardian" class="flex items-center gap-3">
      <ToggleSwitch v-model="form.isActive" input-id="gu-active" />
      <label for="gu-active" class="text-sm text-slate-800"><span class="block font-medium">Apoderado/a activo/a</span><span class="block text-xs text-slate-500">Un apoderado inactivo no se ofrece al registrar involucrados.</span></label>
    </div>
  </MutationDialog>
</template>
