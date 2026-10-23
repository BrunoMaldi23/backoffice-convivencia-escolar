<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import DatePicker from 'primevue/datepicker';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import ToggleSwitch from 'primevue/toggleswitch';
import FormField from '@/components/FormField.vue';
import MutationDialog from '@/components/MutationDialog.vue';
import { useCourses, useCreateStudent, useUpdateStudent } from '@/composables/useCommunity';
import { calendarToDate, dateToCalendar } from '@/lib/format';
import { formatRut } from '@/lib/rut';
import { maxLength, required, rut, validateAll } from '@/lib/validation';
import type { Student } from '@/types/api';

/** Alta y edición de un estudiante (`POST/PATCH /students`). El RUT se valida con su dígito verificador antes de enviarse. */
const props = defineProps<{ establishmentId: string; student: Student | null }>();
const visible = defineModel<boolean>('visible', { default: false });
const emit = defineEmits<{ saved: [student: Student]; reload: [] }>();

const create = useCreateStudent();
const update = useUpdateStudent();
const mutation = computed(() => (props.student ? update : create));
const courses = useCourses(() => ({ establishmentId: props.establishmentId, active: true }), () => visible.value);
const courseOptions = computed(() => (courses.data.value ?? []).map((c) => ({ value: c.id, label: `${c.name} (${c.academicYear})` })));

const form = reactive({ rut: '', firstNames: '', lastNames: '', birthDate: null as Date | null, courseId: null as string | null, isActive: true });
const errors = ref<Record<string, string>>({});
watch(visible, (open) => {
  if (!open) return;
  const s = props.student;
  Object.assign(form, s ? { rut: formatRut(s.rut), firstNames: s.firstNames, lastNames: s.lastNames, birthDate: calendarToDate(s.birthDate), courseId: s.courseId, isActive: s.isActive } : { rut: '', firstNames: '', lastNames: '', birthDate: null, courseId: null, isActive: true });
  errors.value = {}; create.reset(); update.reset();
});

async function submit() {
  errors.value = validateAll(form, { rut: [required('Escriba el RUT del estudiante.'), rut()], firstNames: [required('Escriba los nombres.'), maxLength(120)], lastNames: [required('Escriba los apellidos.'), maxLength(120)] }) as Record<string, string>;
  if (Object.keys(errors.value).length) return;
  const birthDate = form.birthDate ? dateToCalendar(form.birthDate) : undefined;
  try {
    const saved = props.student
      ? await update.mutateAsync({ id: props.student.id, expectedVersion: props.student.version, rut: form.rut, firstNames: form.firstNames.trim(), lastNames: form.lastNames.trim(), birthDate: birthDate ?? null, courseId: form.courseId, isActive: form.isActive })
      : await create.mutateAsync({ establishmentId: props.establishmentId, rut: form.rut, firstNames: form.firstNames.trim(), lastNames: form.lastNames.trim(), birthDate, courseId: form.courseId ?? undefined });
    visible.value = false;
    emit('saved', saved);
  } catch { /* el error se muestra en el diálogo */ }
}
</script>

<template>
  <MutationDialog v-model:visible="visible" :header="student ? 'Editar estudiante' : 'Nuevo estudiante'" :submit-label="student ? 'Guardar cambios' : 'Registrar estudiante'" :pending="mutation.isPending.value" :error="mutation.error.value" @submit="submit" @reload="emit('reload')">
    <FormField id="st-rut" label="RUT" required help="Con o sin puntos, por ejemplo 12.345.678-5." :error="errors.rut">
      <template #default="{ id, invalid, describedby }"><InputText :id="id" v-model="form.rut" maxlength="15" :invalid="invalid" :aria-describedby="describedby" autocomplete="off" inputmode="text" class="w-full" @blur="form.rut = formatRut(form.rut)" /></template>
    </FormField>
    <div class="grid gap-4 sm:grid-cols-2">
      <FormField id="st-first" label="Nombres" required :error="errors.firstNames"><template #default="{ id, invalid, describedby }"><InputText :id="id" v-model="form.firstNames" maxlength="120" :invalid="invalid" :aria-describedby="describedby" autocomplete="off" class="w-full" /></template></FormField>
      <FormField id="st-last" label="Apellidos" required :error="errors.lastNames"><template #default="{ id, invalid, describedby }"><InputText :id="id" v-model="form.lastNames" maxlength="120" :invalid="invalid" :aria-describedby="describedby" autocomplete="off" class="w-full" /></template></FormField>
    </div>
    <div class="grid gap-4 sm:grid-cols-2">
      <FormField id="st-birth" label="Fecha de nacimiento"><template #default="{ id }"><DatePicker v-model="form.birthDate" :input-id="id" date-format="dd-mm-yy" :max-date="new Date()" show-icon icon-display="input" fluid /></template></FormField>
      <FormField id="st-course" label="Curso" help="Opcional."><template #default="{ id }"><Select v-model="form.courseId" :input-id="id" :options="courseOptions" option-label="label" option-value="value" show-clear placeholder="Sin curso" :loading="courses.isPending.value" class="w-full" /></template></FormField>
    </div>
    <div v-if="student" class="flex items-center gap-3">
      <ToggleSwitch v-model="form.isActive" input-id="st-active" />
      <label for="st-active" class="text-sm text-slate-800"><span class="block font-medium">Estudiante activo</span><span class="block text-xs text-slate-500">Un estudiante inactivo no se ofrece al registrar involucrados. Sus expedientes se conservan.</span></label>
    </div>
  </MutationDialog>
</template>
