<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import InputText from 'primevue/inputtext';
import ToggleSwitch from 'primevue/toggleswitch';
import FormField from '@/components/FormField.vue';
import MutationDialog from '@/components/MutationDialog.vue';
import UserSelect from '@/components/UserSelect.vue';
import { useCreateStaff, useUpdateStaff } from '@/composables/useCommunity';
import { formatRut } from '@/lib/rut';
import { email, maxLength, required, rut, validateAll } from '@/lib/validation';
import type { StaffMember } from '@/types/api';

/** Alta y edición de un funcionario (`POST/PATCH /staff`). Puede vincularse a su cuenta de acceso si la tiene. */
const props = defineProps<{ establishmentId: string; member: StaffMember | null }>();
const visible = defineModel<boolean>('visible', { default: false });
const emit = defineEmits<{ reload: [] }>();

const create = useCreateStaff();
const update = useUpdateStaff();
const mutation = computed(() => (props.member ? update : create));
const form = reactive({ firstNames: '', lastNames: '', position: '', rut: '', email: '', phone: '', userId: null as string | null, isActive: true });
const errors = ref<Record<string, string>>({});
watch(visible, (open) => {
  if (!open) return;
  const m = props.member;
  Object.assign(form, m ? { firstNames: m.firstNames, lastNames: m.lastNames, position: m.position, rut: m.rut ? formatRut(m.rut) : '', email: m.email ?? '', phone: m.phone ?? '', userId: m.userId, isActive: m.isActive } : { firstNames: '', lastNames: '', position: '', rut: '', email: '', phone: '', userId: null, isActive: true });
  errors.value = {}; create.reset(); update.reset();
});

async function submit() {
  errors.value = validateAll(form, { firstNames: [required('Escriba los nombres.'), maxLength(120)], lastNames: [required('Escriba los apellidos.'), maxLength(120)], position: [required('Indique el cargo, por ejemplo «Inspector general».'), maxLength(120)], rut: [rut()], email: [email(), maxLength(180)], phone: [maxLength(30)] }) as Record<string, string>;
  if (Object.keys(errors.value).length) return;
  try {
    if (props.member) await update.mutateAsync({ id: props.member.id, expectedVersion: props.member.version, rut: form.rut.trim() || null, firstNames: form.firstNames.trim(), lastNames: form.lastNames.trim(), position: form.position.trim(), email: form.email.trim() || null, phone: form.phone.trim() || null, userId: form.userId, isActive: form.isActive });
    else await create.mutateAsync({ establishmentId: props.establishmentId, rut: form.rut.trim() || undefined, firstNames: form.firstNames.trim(), lastNames: form.lastNames.trim(), position: form.position.trim(), email: form.email.trim() || undefined, phone: form.phone.trim() || undefined, userId: form.userId ?? undefined });
    visible.value = false;
  } catch { /* el error se muestra en el diálogo */ }
}
</script>

<template>
  <MutationDialog v-model:visible="visible" :header="member ? 'Editar funcionario/a' : 'Nuevo funcionario/a'" :submit-label="member ? 'Guardar cambios' : 'Registrar funcionario/a'" :pending="mutation.isPending.value" :error="mutation.error.value" @submit="submit" @reload="emit('reload')">
    <div class="grid gap-4 sm:grid-cols-2">
      <FormField id="sf-first" label="Nombres" required :error="errors.firstNames"><template #default="{ id, invalid, describedby }"><InputText :id="id" v-model="form.firstNames" maxlength="120" :invalid="invalid" :aria-describedby="describedby" autocomplete="off" class="w-full" /></template></FormField>
      <FormField id="sf-last" label="Apellidos" required :error="errors.lastNames"><template #default="{ id, invalid, describedby }"><InputText :id="id" v-model="form.lastNames" maxlength="120" :invalid="invalid" :aria-describedby="describedby" autocomplete="off" class="w-full" /></template></FormField>
    </div>
    <FormField id="sf-position" label="Cargo" required :error="errors.position"><template #default="{ id, invalid, describedby }"><InputText :id="id" v-model="form.position" maxlength="120" :invalid="invalid" :aria-describedby="describedby" autocomplete="off" class="w-full" /></template></FormField>
    <div class="grid gap-4 sm:grid-cols-2">
      <FormField id="sf-rut" label="RUT" help="Opcional." :error="errors.rut"><template #default="{ id, invalid, describedby }"><InputText :id="id" v-model="form.rut" maxlength="15" :invalid="invalid" :aria-describedby="describedby" autocomplete="off" class="w-full" @blur="form.rut = form.rut.trim() ? formatRut(form.rut) : ''" /></template></FormField>
      <FormField id="sf-phone" label="Teléfono" :error="errors.phone"><template #default="{ id, invalid, describedby }"><InputText :id="id" v-model="form.phone" type="tel" maxlength="30" :invalid="invalid" :aria-describedby="describedby" autocomplete="off" class="w-full" /></template></FormField>
    </div>
    <FormField id="sf-email" label="Correo" :error="errors.email"><template #default="{ id, invalid, describedby }"><InputText :id="id" v-model="form.email" type="email" maxlength="180" :invalid="invalid" :aria-describedby="describedby" autocomplete="off" class="w-full" /></template></FormField>
    <FormField id="sf-user" label="Cuenta de acceso" help="Opcional. Vincule a la persona con su cuenta si usa la plataforma; la cuenta debe pertenecer al establecimiento."><template #default="{ id, invalid, describedby }"><UserSelect :id="id" v-model="form.userId" :invalid="invalid" :describedby="describedby" placeholder="Sin cuenta vinculada" show-clear /></template></FormField>
    <div v-if="member" class="flex items-center gap-3">
      <ToggleSwitch v-model="form.isActive" input-id="sf-active" />
      <label for="sf-active" class="text-sm text-slate-800"><span class="block font-medium">Funcionario/a activo/a</span><span class="block text-xs text-slate-500">Un funcionario inactivo no se ofrece al registrar involucrados.</span></label>
    </div>
  </MutationDialog>
</template>
